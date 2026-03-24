"""Core Agent implementation for agent-flow Python SDK."""

from __future__ import annotations

import json
import time
import uuid
from typing import Any

from openai import AsyncOpenAI

from agent_flow.tool import ToolDefinition
from agent_flow.types import (
    AgentConfig,
    AgentRunResult,
    Message,
    Provider,
    Role,
    ToolResult,
)


class Agent:
    """An AI agent that can use tools to accomplish tasks.

    The agent follows a think → act → observe loop:
    1. Think: LLM processes the conversation and decides what to do
    2. Act: If tool calls are needed, execute them
    3. Observe: Add tool results to context, repeat if needed

    Example:
        agent = Agent(AgentConfig(
            name="researcher",
            system_prompt="You are a research assistant.",
            tools=[search_tool, calculator_tool],
        ))
        result = await agent.run("What is the population of Tokyo?")
        print(result.output)
    """

    def __init__(self, config: AgentConfig) -> None:
        self.id = str(uuid.uuid4())
        self.config = config
        self.tools: dict[str, ToolDefinition] = {}

        for tool_def in config.tools:
            self.register_tool(tool_def)

        # Initialize provider
        if config.provider == Provider.OPENAI:
            self._client = AsyncOpenAI()
        else:
            try:
                from anthropic import AsyncAnthropic

                self._client = AsyncAnthropic()
            except ImportError as e:
                raise ImportError(
                    "Install anthropic SDK: pip install agent-flow[anthropic]"
                ) from e

    def register_tool(self, tool_def: ToolDefinition) -> None:
        """Register a tool the agent can use."""
        self.tools[tool_def.name] = tool_def

    async def run(self, input_text: str, conversation_id: str | None = None) -> AgentRunResult:
        """Run the agent with a user message through the think→act→observe loop."""
        start_time = time.time()
        _conv_id = conversation_id or str(uuid.uuid4())
        all_tool_results: list[ToolResult] = []
        total_tokens = 0
        iterations = 0

        messages: list[dict[str, Any]] = [
            {"role": "system", "content": self.config.system_prompt},
            {"role": "user", "content": input_text},
        ]

        tool_schemas = [t.to_openai_schema() for t in self.tools.values()] if self.tools else None

        while iterations < self.config.max_iterations:
            iterations += 1

            # Think: get model response
            response = await self._chat(messages, tool_schemas)
            choice = response.choices[0]
            msg = choice.message
            total_tokens += getattr(response.usage, "total_tokens", 0)

            # Add assistant message to history
            messages.append(msg.model_dump(exclude_none=True))

            # If no tool calls, agent is done
            if not msg.tool_calls:
                break

            # Act: execute tool calls
            for tc in msg.tool_calls:
                tool_start = time.time()
                tool_name = tc.function.name
                tool_def = self.tools.get(tool_name)

                if not tool_def:
                    result = ToolResult(
                        tool_call_id=tc.id,
                        name=tool_name,
                        result=None,
                        error=f"Unknown tool: {tool_name}",
                        duration_ms=(time.time() - tool_start) * 1000,
                    )
                else:
                    try:
                        args = json.loads(tc.function.arguments)
                        output = await tool_def.execute(**args)
                        result = ToolResult(
                            tool_call_id=tc.id,
                            name=tool_name,
                            result=output,
                            duration_ms=(time.time() - tool_start) * 1000,
                        )
                    except Exception as e:
                        result = ToolResult(
                            tool_call_id=tc.id,
                            name=tool_name,
                            result=None,
                            error=str(e),
                            duration_ms=(time.time() - tool_start) * 1000,
                        )

                all_tool_results.append(result)

                # Observe: add tool result to context
                content = (
                    f"Error: {result.error}"
                    if result.error
                    else json.dumps(result.result) if not isinstance(result.result, str) else result.result
                )
                messages.append({
                    "role": "tool",
                    "tool_call_id": tc.id,
                    "content": content,
                })

        # Extract final output
        last_assistant = None
        for m in reversed(messages):
            if m.get("role") == "assistant" and m.get("content"):
                last_assistant = m["content"]
                break

        duration_ms = (time.time() - start_time) * 1000
        status = "max_iterations" if iterations >= self.config.max_iterations else "success"

        return AgentRunResult(
            output=last_assistant or "",
            messages=[self._to_message(m) for m in messages],
            tool_calls=all_tool_results,
            iterations=iterations,
            total_tokens=total_tokens,
            duration_ms=duration_ms,
            status=status,
        )

    async def _chat(self, messages: list[dict[str, Any]], tools: list[dict[str, Any]] | None) -> Any:
        """Send a chat completion request."""
        params: dict[str, Any] = {
            "model": self.config.model,
            "messages": messages,
            "temperature": self.config.temperature,
            "max_tokens": self.config.max_tokens,
        }
        if tools:
            params["tools"] = tools
        return await self._client.chat.completions.create(**params)

    @staticmethod
    def _to_message(raw: dict[str, Any]) -> Message:
        role_map = {"system": Role.SYSTEM, "user": Role.USER, "assistant": Role.ASSISTANT, "tool": Role.TOOL}
        role = role_map.get(raw.get("role", ""), Role.USER)
        content = raw.get("content", "")
        if not isinstance(content, str):
            content = json.dumps(content) if content else ""
        return Message(
            role=role,
            content=content,
            tool_call_id=raw.get("tool_call_id"),
        )
