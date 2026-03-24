"""Tests for the tool decorator."""

from agent_flow.tool import tool, ToolDefinition


@tool(name="greet", description="Greet someone")
def greet(name: str, excited: bool = False) -> str:
    suffix = "!" if excited else "."
    return f"Hello, {name}{suffix}"


def test_tool_creates_definition():
    assert isinstance(greet, ToolDefinition)
    assert greet.name == "greet"
    assert greet.description == "Greet someone"


def test_tool_schema_extraction():
    schema = greet.parameters
    assert schema["type"] == "object"
    assert "name" in schema["properties"]
    assert schema["properties"]["name"]["type"] == "string"
    assert "required" in schema
    assert "name" in schema["required"]


def test_tool_openai_schema():
    schema = greet.to_openai_schema()
    assert schema["type"] == "function"
    assert schema["function"]["name"] == "greet"


async def test_tool_execution():
    result = await greet.execute(name="World", excited=True)
    assert result == "Hello, World!"
