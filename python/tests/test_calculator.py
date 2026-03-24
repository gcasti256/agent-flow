"""Tests for the calculator tool."""

import pytest
from agent_flow.tools.calculator import calculator


def test_basic_addition():
    result = calculator.func(expression="2 + 3")
    assert result["result"] == 5.0


def test_multiplication():
    result = calculator.func(expression="4 * 7")
    assert result["result"] == 28.0


def test_complex_expression():
    result = calculator.func(expression="(2 + 3) * 4 - 1")
    assert result["result"] == 19.0


def test_power():
    result = calculator.func(expression="2 ** 10")
    assert result["result"] == 1024.0


def test_division():
    result = calculator.func(expression="10 / 3")
    assert abs(result["result"] - 3.3333333333333335) < 1e-10


def test_negative_numbers():
    result = calculator.func(expression="-5 + 3")
    assert result["result"] == -2.0


def test_invalid_expression():
    with pytest.raises(ValueError):
        calculator.func(expression="import os")
