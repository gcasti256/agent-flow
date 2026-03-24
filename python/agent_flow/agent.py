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


class _FunctionCall:
    """Mimics OpenAI's FunctionCall object."""

    def __init__(self, name: str, arguments: str) -> None:
        self.name = name
        self.arguments = arguments


class _ToolCallAdapter:
    """Mimics OpenAI's ToolCall object from an Anthropic tool_use block."""

    def __init__(self, block: Any) -> None:
        self.id = block.id
        self.type = "function"
        self.function = _FunctionCall(
            name=block.name,
            arguments=json.dumps(block.input) if not isinstance(block.input, str) else block.input,
        )


class _MessageAdapter:
    """Mimics OpenAI's ChatCompletionMessage from an Anthropic response."""

    def __init__(self, response: Any) -> None:
        self.content: str | None = None
        self.tool_calls: list[_ToolCallAdapter] | None = None

        text_parts = []
        tool_calls = []
        for block in response.content:
            if block.type == "text":
                text_parts.append(block.text)
            elif block.type == "tool_use":
                tool_calls.append(_ToolCallAdapter(block))

        self.content = "".join(text_parts) if text_parts else None
        self.tool_calls = tool_calls if tool_calls else None

    def model_dump(self, exclude_none: bool = False) -> dict[str, Any]:
        result: dict[str, Any] = {"role": "assistant"}
        if self.content is not None:
            result["content"] = self.content
        if self.tool_calls is not None:
            result["tool_calls"] = [
                {
                    "id": tc.id,
                    "type": "function",
                    "function": {
                        "name": tc.function.name,
                        "arguments": tc.function.arguments,
                    },
                }
                for tc in self.tool_calls
            ]
        elif exclude_none:
            pass  # omit tool_calls
        else:
            result["tool_calls"] = None
        return result


class _UsageAdapter:
    """Mimics OpenAI's CompletionUsage from Anthropic usage."""

    def __init__(self, usage: Any) -> None:
        self.prompt_tokens = getattr(usage, "input_tokens", 0)
        self.completion_tokens = getattr(usage, "output_tokens", 0)
        self.total_tokens = self.prompt_tokens + self.completion_tokens


class _ChoiceAdapter:
    """Mimics OpenAI's Choice object."""

    def __init__(self, message: _MessageAdapter) -> None:
        self.message = message


class _AnthropicResponseAdapter:
    """Wraps an Anthropic Messages response in an OpenAI-compatible interface.

    This allows the agent loop to process Anthropic responses using the same
    code path as OpenAI responses (accessing .choices[0].message, .usage, etc.).
    """

    def __init__(self, response: Any) -> None:
        message = _MessageAdapter(response)
        self.choices = [_ChoiceAdapter(message)]
        self.usage = _UsageAdapter(response.usage)


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
        if self.config.provider == Provider.ANTHROPIC:
            return await self._chat_anthropic(messages, tools)

        params: dict[str, Any] = {
            "model": self.config.model,
            "messages": messages,
            "temperature": self.config.temperature,
            "max_tokens": self.config.max_tokens,
        }
        if tools:
            params["tools"] = tools
        return await self._client.chat.completions.create(**params)

    async def _chat_anthropic(self, messages: list[dict[str, Any]], tools: list[dict[str, Any]] | None) -> Any:
        """Send a chat request via the Anthropic API.

        Anthropic's API requires the system prompt as a separate 'system' parameter,
        not as a message with role 'system'. Tool results use role 'user' with
        tool_result content blocks rather than role 'tool'.
        """
        # Extract system message — Anthropic expects it as a separate parameter
        system_prompt = ""
        non_system: list[dict[str, Any]] = []
        for msg in messages:
            if msg.get("role") == "system":
                system_prompt = msg.get("content", "")
            else:
                non_system.append(msg)

        # Convert OpenAI-style tool messages to Anthropic format
        anthropic_messages: list[dict[str, Any]] = []
        for msg in non_system:
            if msg.get("role") == "tool":
                anthropic_messages.append({
                    "role": "user",
                    "content": [{
                        "type": "tool_result",
                        "tool_use_id": msg.get("tool_call_id", ""),
                        "content": msg.get("content", ""),
                    }],
                })
            elif msg.get("role") == "assistant" and msg.get("tool_calls"):
                # Convert assistant tool_calls to Anthropic content blocks
                content_blocks: list[dict[str, Any]] = []
                text_content = msg.get("content")
                if text_content:
                    content_blocks.append({"type": "text", "text": text_content})
                for tc in msg["tool_calls"]:
                    fn = tc if isinstance(tc, dict) else tc.get("function", tc)
                    func = fn.get("function", fn)
                    content_blocks.append({
                        "type": "tool_use",
                        "id": fn.get("id", tc.get("id", "")),
                        "name": func.get("name", ""),
                        "input": json.loads(func["arguments"]) if isinstance(func.get("arguments"), str) else func.get("arguments", {}),
                    })
                anthropic_messages.append({"role": "assistant", "content": content_blocks})
            else:
                anthropic_messages.append({
                    "role": msg.get("role", "user"),
                    "content": msg.get("content", ""),
                })

        params: dict[str, Any] = {
            "model": self.config.model,
            "max_tokens": self.config.max_tokens,
            "messages": anthropic_messages,
        }
        if system_prompt:
            params["system"] = system_prompt
        if self.config.temperature is not None:
            params["temperature"] = self.config.temperature
        if tools:
            # Convert OpenAI-style tool schemas to Anthropic format
            anthropic_tools = []
            for t in tools:
                func = t.get("function", t)
                anthropic_tools.append({
                    "name": func.get("name", t.get("name", "")),
                    "description": func.get("description", t.get("description", "")),
                    "input_schema": func.get("parameters", t.get("parameters", {})),
                })
            params["tools"] = anthropic_tools

        response = await self._client.messages.create(**params)

        # Convert Anthropic response to OpenAI-compatible format for the agent loop
        return _AnthropicResponseAdapter(response)

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
