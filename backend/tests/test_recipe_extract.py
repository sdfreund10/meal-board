from __future__ import annotations

import json
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pytest
import requests
from app.services import recipe_extract

SAMPLE_HTML = """
<html>
  <head><title>Ignore me</title><script>alert(1)</script></head>
  <body>
    <h1>Tomato Pasta</h1>
    <style>.x{color:red}</style>
    <p>Ingredients: pasta, tomatoes</p>
    <a href="/ads">Buy now</a>
    <img src="food.jpg" />
  </body>
</html>
"""

SAMPLE_RECIPE = {
    "name": "Tomato Pasta",
    "ingredients": [
        {"name": "pasta", "amount": "12 oz"},
        {"name": "tomatoes", "amount": "2"},
    ],
    "steps": [
        "Boil the pasta",
        "Sauce the tomatoes",
    ],
}


def test_parse_html_strips_noise_and_keeps_body_text() -> None:
    markdown = recipe_extract._parse_html(SAMPLE_HTML)

    assert "Tomato Pasta" in markdown
    assert "Ingredients" in markdown
    assert "alert(1)" not in markdown
    assert "Buy now" not in markdown
    assert "food.jpg" not in markdown


@patch.dict("os.environ", {"OPENROUTER_API_KEY": "test-key"}, clear=False)
@patch("app.services.recipe_extract.OpenRouter")
@patch("app.services.recipe_extract._fetch_html", return_value=SAMPLE_HTML)
def test_extract_recipe_calls_openrouter(
    mock_fetch: MagicMock,
    mock_openrouter: MagicMock,
) -> None:
    client = MagicMock()
    mock_openrouter.return_value.__enter__.return_value = client
    mock_openrouter.return_value.__exit__.return_value = None
    client.chat.send.return_value = SimpleNamespace(
        choices=[
            SimpleNamespace(
                message=SimpleNamespace(content=json.dumps(SAMPLE_RECIPE)),
            )
        ]
    )

    result = recipe_extract.extract_recipe("https://example.com/pasta")

    mock_fetch.assert_called_once_with("https://example.com/pasta")
    mock_openrouter.assert_called_once_with(api_key="test-key")
    client.chat.send.assert_called_once()
    call_kwargs = client.chat.send.call_args.kwargs
    assert call_kwargs["model"] == "openai/gpt-5.6-luna"
    assert call_kwargs["stream"] is False
    assert call_kwargs["response_format"] == recipe_extract.RESPONSE_FORMAT
    assert result == SAMPLE_RECIPE


@patch("app.services.recipe_extract.extract_recipe", return_value=SAMPLE_RECIPE)
def test_recipe_from_url(mock_extract: MagicMock) -> None:
    recipe = recipe_extract.recipe_from_url("https://example.com/pasta")

    mock_extract.assert_called_once_with("https://example.com/pasta")
    assert recipe.name == "Tomato Pasta"
    assert recipe.source_url == "https://example.com/pasta"
    assert [i.name for i in recipe.ingredients] == ["pasta", "tomatoes"]
    assert [i.quantity for i in recipe.ingredients] == ["12 oz", "2"]
    assert [s.text for s in recipe.steps] == ["Boil the pasta", "Sauce the tomatoes"]
    assert [s.position for s in recipe.steps] == [0, 1]


@patch("app.services.recipe_extract.requests.get")
def test_fetch_html_raises_for_http_errors(mock_get: MagicMock) -> None:
    response = MagicMock()
    response.raise_for_status.side_effect = requests.HTTPError("404")
    mock_get.return_value = response

    with pytest.raises(requests.HTTPError):
        recipe_extract._fetch_html("https://example.com/missing")
