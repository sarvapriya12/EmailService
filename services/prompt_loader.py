from functools import lru_cache
from pathlib import Path
from string import Template


PROMPTS_DIR = Path(__file__).resolve().parent.parent / "prompts"


@lru_cache(maxsize=None)
def load_prompt_template(template_name: str) -> Template:
	path = PROMPTS_DIR / template_name

	if not path.exists():
		raise FileNotFoundError(f"Prompt template not found: {path}")

	return Template(path.read_text(encoding="utf-8").strip())


def render_prompt(template_name: str, **values: object) -> str:
	return load_prompt_template(template_name).safe_substitute(
		{key: str(value) for key, value in values.items()}
	)