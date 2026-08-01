"""Count words, characters, lines, and paragraphs for the status bar."""


def calculate_stats(content: str) -> dict[str, int]:
    """Return writing statistics for ``content``; empty text still has one line."""
    return {
        "words": len(content.split()) if content.strip() else 0,
        "characters": len(content),
        "characters_no_spaces": len(content.replace(" ", "").replace("\n", "")),
        "lines": len(content.split("\n")),
        "paragraphs": len([part for part in content.split("\n\n") if part.strip()]),
    }
