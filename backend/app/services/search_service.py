"""Case-insensitive line/column search used by ``POST /search``."""


def find_matches(content: str, query: str) -> list[dict[str, str | int]]:
    """Return every non-overlapping occurrence with one-based coordinates."""
    matches = []
    query_lower = query.lower()
    for line_number, line in enumerate(content.split("\n"), start=1):
        start = 0
        while (position := line.lower().find(query_lower, start)) != -1:
            matches.append({"line": line_number, "column": position + 1, "text": line})
            start = position + len(query)
    return matches
