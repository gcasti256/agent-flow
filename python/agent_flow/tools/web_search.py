"""Web search tool (mock implementation for demo)."""

from typing import Any
from urllib.parse import quote

from agent_flow.tool import tool


@tool(name="web_search", description="Search the web for information")
def web_search(query: str, max_results: int = 5) -> dict[str, Any]:
    """Search the web for information.

    In production, connect to a real search API (Google, Bing, Brave, etc.).
    This mock implementation demonstrates the tool pattern.

    Args:
        query: Search query string
        max_results: Maximum number of results

    Returns:
        Dict with query and results list
    """
    encoded = quote(query.replace(" ", "_"))
    results = [
        {
            "title": f"{query} - Wikipedia",
            "url": f"https://en.wikipedia.org/wiki/{encoded}",
            "snippet": f"Comprehensive information about {query}.",
        },
        {
            "title": f"Understanding {query} - Complete Guide",
            "url": f"https://example.com/guide/{quote(query)}",
            "snippet": f"Learn everything about {query} with practical examples.",
        },
        {
            "title": f"{query} | Latest Research",
            "url": f"https://arxiv.org/search/?query={quote(query)}",
            "snippet": f"Recent academic papers on {query}.",
        },
    ]
    return {
        "query": query,
        "total_results": min(len(results), max_results),
        "results": results[:max_results],
    }
