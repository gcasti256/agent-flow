"""Core type definitions for agent-flow."""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any


class Role(str, Enum):
    SYSTEM = "system"
    USER = "user"
    ASSISTANT = "assistant"
    TOOL = "tool"


class Provider(str, Enum):
    OPENAI = "openai"
    ANTHROPIC = "anthropic"


@dataclass
class Message:
    role: Role
    content: str
    name: str | None = None
    tool_call_id: str | None = None
    tool_calls: list[ToolCall] | None = None


@dataclass
class ToolCall:
    id: str
    name: str
    arguments: dict[str, Any]


@dataclass
class ToolResult:
    tool_call_id: str
    name: str
    result: Any
    error: str | None = None
    duration_ms: float = 0


@dataclass
class AgentConfig:
    name: str
    system_prompt: str
    provider: Provider = Provider.OPENAI
    model: str = "gpt-4o"
    temperature: float = 0.7
    max_tokens: int = 4096
    max_iterations: int = 10
    tools: list[Any] = field(default_factory=list)


@dataclass
class AgentRunResult:
    output: str
    messages: list[Message]
    tool_calls: list[ToolResult]
    iterations: int
    total_tokens: int
    duration_ms: float
    status: str  # "success" | "max_iterations" | "error"
    error: str | None = None
