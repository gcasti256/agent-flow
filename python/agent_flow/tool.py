"""Tool decorator and registry for agent-flow."""

from __future__ import annotations

import inspect
from dataclasses import dataclass
from typing import Any, Callable, get_type_hints


@dataclass
class ToolDefinition:
    name: str
    description: str
    parameters: dict[str, Any]
    func: Callable[..., Any]

    async def execute(self, **kwargs: Any) -> Any:
        """Execute the tool with the given parameters."""
        if inspect.iscoroutinefunction(self.func):
            return await self.func(**kwargs)
        return self.func(**kwargs)

    def to_openai_schema(self) -> dict[str, Any]:
        """Convert to OpenAI function calling format."""
        return {
            "type": "function",
            "function": {
                "name": self.name,
                "description": self.description,
                "parameters": self.parameters,
            },
        }


def tool(
    name: str | None = None,
    description: str = "",
) -> Callable[[Callable[..., Any]], ToolDefinition]:
    """Decorator to define a tool from a function.

    Usage:
        @tool(name="calculator", description="Perform arithmetic")
        def calculator(expression: str) -> dict:
            return {"result": eval(expression)}
    """

    def decorator(func: Callable[..., Any]) -> ToolDefinition:
        tool_name = name or func.__name__
        tool_desc = description or func.__doc__ or ""
        params = _extract_parameters(func)
        return ToolDefinition(
            name=tool_name,
            description=tool_desc,
            parameters=params,
            func=func,
        )

    return decorator


def _extract_parameters(func: Callable[..., Any]) -> dict[str, Any]:
    """Extract JSON Schema parameters from function type hints."""
    hints = get_type_hints(func)
    sig = inspect.signature(func)
    properties: dict[str, Any] = {}
    required: list[str] = []

    type_map = {
        str: "string",
        int: "integer",
        float: "number",
        bool: "boolean",
    }

    for param_name, param in sig.parameters.items():
        if param_name in ("self", "cls", "return"):
            continue

        hint = hints.get(param_name, str)
        json_type = type_map.get(hint, "string")
        properties[param_name] = {"type": json_type}

        if param.default is inspect.Parameter.empty:
            required.append(param_name)
        else:
            properties[param_name]["default"] = param.default

    schema: dict[str, Any] = {"type": "object", "properties": properties}
    if required:
        schema["required"] = required
    return schema
