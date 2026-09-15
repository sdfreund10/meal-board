import json
import os

import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from markdownify import markdownify as md
from openrouter import OpenRouter

from app.models.recipe import Recipe, RecipeIngredient, RecipeStep

load_dotenv()

USER_AGENT = """
Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36
""".strip()
HEADERS = {
    "User-Agent": USER_AGENT
}
def _fetch_html(url: str) -> str:
    response = requests.get(url, headers=HEADERS)
    response.raise_for_status()
    return response.text

# may need to strip out some stuff
def _parse_html(html: str) -> str:
    soup = BeautifulSoup(html, "html.parser")
    for script_or_style in soup(['script', 'style', 'a', 'img', 'svg']):
        script_or_style.decompose()
    return md(str(soup.body))

SYSTEM_PROMPT = """
You will be given a document that contains a recipe.
Your goal is to extract the key information necessary to recreate the recipe.
"""

RESPONSE_FORMAT = {
    "type": "json_schema",
    "json_schema": {
        "name": "recipe",
        "strict": True,
        "schema": {
            "type": "object",
            "properties": {
                "name": {
                    "type": "string",
                    "description": "Recipe title."
                },
                "ingredients": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "name": {
                                "type": "string",
                                "decription": "ONLY the bare ingredient name"
                            },
                            "amount": {
                                "type": "string",
                                "description": "Amount of the ingredient needed."
                            }
                        },
                        "required": ["name", "amount"],
                        "additionalProperties": False
                    },
                    "description": "Ingredients needed fo the recipe."
                },
                "steps": {
                    "type": "array",
                    "items": { "type": "string"},
                    "description": "Steps to follow to recreate the recipe."
                }
            },
            "required": ["name", "ingredients", "steps"],
            "additionalProperties": False
        }
    }
}

def extract_recipe(url: str) -> dict:
    html = _fetch_html(url)
    markdown = _parse_html(html)

    with OpenRouter(
        api_key=os.getenv("OPENROUTER_API_KEY", ""),
    ) as open_router:
        res = open_router.chat.send(
            model="openai/gpt-5.6-luna",
            messages=[
                {"content": SYSTEM_PROMPT, "role": "system"},
                {"content": markdown, "role": "user"}
            ],
            stream=False,
            response_format=RESPONSE_FORMAT
        )
        return json.loads(res.choices[0].message.content)

def recipe_from_url(url: str) -> Recipe:
    """
    Extracts recipe data from a URL and returns a draft recipe object.
    """
    recipe_data = extract_recipe(url)
    ingredients = [
        RecipeIngredient(
            name=ingredient["name"],
            quantity=ingredient["amount"],
            position=index
        )
        for index, ingredient in enumerate(recipe_data["ingredients"])
    ]
    steps = [
        RecipeStep(
            text=step,
            position=index,
        )
        for index, step in enumerate(recipe_data["steps"])
    ]
    recipe = Recipe(
        name=recipe_data["name"],
        source_url=url,
        ingredients=ingredients,
        steps=steps
    )
    return recipe