"""Calculator tool for safe arithmetic evaluation."""

import ast
import operator
from typing import Any

from agent_flow.tool import tool

SAFE_OPS = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.Pow: operator.pow,
    ast.Mod: operator.mod,
    ast.USub: operator.neg,
}


MAX_EXPONENT = 1000  # Prevent DoS via huge exponents like 2**999999999


def _safe_eval(node: ast.AST) -> float:
    """Safely evaluate an AST math expression."""
    if isinstance(node, ast.Constant) and isinstance(node.value, (int, float)):
        return float(node.value)
    if isinstance(node, ast.BinOp) and type(node.op) in SAFE_OPS:
        left = _safe_eval(node.left)
        right = _safe_eval(node.right)
        if isinstance(node.op, ast.Pow):
            if abs(right) > MAX_EXPONENT:
                raise ValueError(
                    f"Exponent too large: {right} (max {MAX_EXPONENT})"
                )
        return SAFE_OPS[type(node.op)](left, right)
    if isinstance(node, ast.UnaryOp) and type(node.op) in SAFE_OPS:
        return SAFE_OPS[type(node.op)](_safe_eval(node.operand))
    raise ValueError(f"Unsupported expression: {ast.dump(node)}")


@tool(name="calculator", description="Perform safe arithmetic calculations")
def calculator(expression: str) -> dict[str, Any]:
    """Evaluate a mathematical expression safely.

    Args:
        expression: A math expression like '2 + 3 * 4'

    Returns:
        Dict with expression and result
    """
    try:
        tree = ast.parse(expression, mode="eval")
    except SyntaxError as e:
        raise ValueError(f"Invalid expression: {expression}") from e
    result = _safe_eval(tree.body)
    return {"expression": expression, "result": result}
