# check number of ingredients
def _ingredient_count_difference(exctracted: dict, expected: dict) -> int:
    return expected["ingredient_count"] - len(exctracted["ingredients"])
# string inclusion on most important ingredient
def _fuzzy_match_ingredients(extracted: dict, expected: dict) -> str:
    # match = next((x for x in numbers if x > 10), None)
    expected_ingredients = expected["important_ingredients"]
    match_data = []
    for expected_ingredient in expected_ingredients:
        matched = False
        for ingredient in extracted["ingredients"]:
            if expected_ingredient["name"].lower() in ingredient["name"].lower():
                # Could be brittle to spaces in amount - 3g vs 3 g
                # Could also be brittle to abreviations in amount - tablespoon vs tbsp
                matched_amount = expected_ingredient["amount"].lower() in ingredient["amount"].lower()
                match_data.append({
                    "ingredient": expected_ingredient["name"],
                    "matched": True,
                    "matched_amount": matched_amount
                })
                matched =True
                break

        if not matched:
            match_data.append({
                "ingredient": ingredient["name"],
                "matched": False,
                "matched_amount": False
            })
    return match_data
# check number of steps
def _step_count_difference(extracted: dict, expected: dict) -> int:
    return expected["step_count"] - len(extracted["steps"])
# inclusion check on most important steps - ignore order for now
def _fuzzy_match_steps(extracted: dict, expected: dict) -> str:
    expected_steps = expected["important_steps"]
    match_data = []
    for expected_step in expected_steps:
        matched = False
        for step in extracted["steps"]:
            if expected_step.lower() in step.lower():
                match_data.append({
                    "step": expected_step,
                    "matched": True
                })
                matched = True
                break
        if not matched:
            match_data.append({
                "step": expected_step,
                "matched": False
            })
    return match_data

# TODO: Check name
def score_recipe(extracted: dict, expected: dict) -> dict:
    ingredient_matches = _fuzzy_match_ingredients(extracted, expected)
    step_matches = _fuzzy_match_steps(extracted, expected)
    ingredient_count_difference = _ingredient_count_difference(extracted, expected)
    step_count_difference = _step_count_difference(extracted, expected)
    details = {
        "ingredient_count_off": ingredient_count_difference,
        "ingredient_matches": ingredient_matches,
        "step_count_off": step_count_difference,
        "step_matches": step_matches
    }
    matched_ingredient_count = sum(1 for match in ingredient_matches if match["matched"])
    ingredient_matched_percent = abs(matched_ingredient_count - len(ingredient_matches)) / len(ingredient_matches)
    matched_step_count = sum(1 for match in step_matches if match["matched"])
    step_matched_percent = abs(matched_step_count - len(step_matches)) / len(step_matches)
    # We want to ensure ingredients match as close as possible
    # Steps may be condensed, expended, or reworded so don't penalize as hard
    score = 100 + \
        -30 * abs(ingredient_count_difference) / expected["ingredient_count"] + \
        -10 * abs(step_count_difference) / expected["step_count"] + \
        -40 * ingredient_matched_percent + \
        -20 * step_matched_percent

    return {
        "score": score,
        "details": details
    }

#     {
#       "case": "artisan-bread",
#       "latency_ms": 7417.5,
#       "predicted": {
#         "name": "Artisan Bread",
#         "ingredients": [
#           {
#             "name": "instant yeast",
#             "amount": "7 g (2 tsp)"
#           },
#           {
#             "name": "sugar",
#             "amount": "5 g (1 tsp)"
#           },
#           {
#             "name": "warm water",
#             "amount": "300 ml (1 1/4 cups)"
#           },
#           {
#             "name": "plain all-purpose flour",
#             "amount": "450 g (3 3/4 cups), plus 60 g (1/2 cup) for dusting and shaping"
#           },
#           {
#             "name": "salt",
#             "amount": "8.5 g (1 1/2 tsp)"
#           },
#           {
#             "name": "olive or vegetable oil",
#             "amount": "A little, for greasing"
#           }
#         ],
#         "steps": [
#           "Add the yeast, sugar, and warm water to a large bowl. Leave for 5 minutes, until the yeast begins to foam.",
#           "Add the flour and salt. Mix until fully combined.",
#           "Knead with a dough hook on medium speed for 10 minutes, or knead by hand on a lightly oiled work surface for 10 minutes. The dough will be sticky.",
#           "Place the dough in a lightly oiled bowl. Cover and let it prove for 1 hour, or until doubled in size.",
#           "Flour the work surface with about 30 g flour and turn out the dough. Sprinkle with another tablespoon of flour as needed.",
#           "Shape the dough without knocking out the air: pull sections from the outside into the center, working all the way around until the dough holds its shape. Turn it over and round it gently.",
#           "Place the dough seam-side down in a well-floured proving basket or bowl. Cover and prove for 30 minutes.",
#           "Meanwhile, place a Dutch oven, approximately 25 cm (10 inches) in diameter, in the oven and preheat to 230\u00b0C/450\u00b0F fan.",
#           "Place a sheet of parchment paper over the proving bowl and carefully turn the dough onto it so it is seam-side up.",
#           "Carefully remove the hot Dutch oven and its lid. Use the parchment to lower the dough into the pot, then cover with the lid.",
#           "Bake covered for 30 minutes. Remove the lid and bake for another 10\u201315 minutes, until golden brown.",
#           "Transfer the bread to a cooling rack and allow it to cool completely before slicing."
#         ]
#       }
#     }