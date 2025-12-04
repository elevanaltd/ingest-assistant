---
name: python-best-practices
description: Python development best practices including PEP 8 style guidelines, type hints, docstring conventions, and common patterns. Use when writing or modifying Python code.
---

# Python Best Practices

PYTHON_MASTERY::[PEP8_COMPLIANCE+TYPE_HINTS+NUMPY_DOCSTRINGS+MODERN_PATTERNS]→PRODUCTION_QUALITY

---

## STYLE GUIDELINES (PEP 8)

```octave
PEP8_RULES::[
  indentation::4_spaces_per_level,
  line_length::79_chars_code[72_docstrings],
  blank_lines::2_between_top_level[1_between_methods],
  imports::top_of_file[stdlib→third_party→local],
  naming::[
    snake_case→functions+variables+modules,
    PascalCase→classes,
    UPPER_SNAKE_CASE→constants,
    _leading_underscore→internal/private
  ]
]

IMPORT_ORGANIZATION::
  # 1. Standard library
  import os, sys
  from pathlib import Path

  # 2. Third-party
  import requests, numpy as np

  # 3. Local
  from myapp.core import MyClass

CIRCULAR_IMPORTS::
  from typing import TYPE_CHECKING
  if TYPE_CHECKING:
      from myapp.other import OtherClass  # Type hints only
```

---

## TYPE HINTS (CRITICAL)

```octave
TYPE_HINT_MANDATE::[
  ALWAYS::function_signatures[params+return_types],
  MODERN_SYNTAX::use_|_not_Union[Python_3.10+],
  GENERIC_BUILTIN::list[str]_not_List[str][Python_3.9+],
  VARIABLES::annotate_complex_types[dict[str, list[int]]]
]

EXAMPLE_TYPED_FUNCTION::
  def process_data(
      items: list[str],
      max_count: int | None = None,
      verbose: bool = False
  ) -> dict[str, int]:
      """Process items and return counts.

      Parameters
      ----------
      items : list[str]
          List of items to process
      max_count : int | None, optional
          Maximum items to process (default: None)
      verbose : bool, optional
          Enable verbose output (default: False)

      Returns
      -------
      dict[str, int]
          Dictionary mapping items to counts
      """
      result: dict[str, int] = {}
      for item in items[:max_count]:
          result[item] = result.get(item, 0) + 1
          if verbose:
              print(f"Processed: {item}")
      return result
```

---

## DOCSTRINGS (NumPy Style)

```octave
DOCSTRING_FORMAT::NumPy_style[
  summary::one_line_description,
  extended::detailed_explanation[optional],
  sections::[Parameters, Returns, Raises, Examples, Notes]
]

CLASS_DOCSTRING::
  class DataProcessor:
      """Process and transform data from various sources.

      Parameters
      ----------
      source_dir : Path
          Directory containing source data files
      cache_enabled : bool, optional
          Enable result caching (default: True)

      Attributes
      ----------
      source_dir : Path
          Directory path for source files
      cache : dict[str, Any]
          Cache for processed results
      """
```

---

## ERROR HANDLING

```octave
ERROR_PATTERNS::[
  SPECIFIC_EXCEPTIONS::catch_specific≠bare_except,
  CONTEXT_MANAGERS::use_with_for_resources[files, locks, connections],
  CUSTOM_EXCEPTIONS::domain_specific_errors[ValidationError, DataProcessingError]
]

EXAMPLE_ERROR_HANDLING::
  # Good - Specific exceptions
  try:
      with open(file_path) as f:
          data = f.read()
  except FileNotFoundError:
      logger.error(f"File not found: {file_path}")
      raise
  except PermissionError:
      logger.error(f"Permission denied: {file_path}")
      raise

  # Avoid - Too broad
  try:
      do_something()
  except:  # Catches everything, including KeyboardInterrupt!
      pass
```

---

## COMMON PATTERNS

```octave
DATACLASSES::[
  USE_FOR::simple_data_containers,
  FEATURES::[auto_init, auto_repr, field_defaults, post_init_validation]
]

EXAMPLE_DATACLASS::
  from dataclasses import dataclass, field

  @dataclass
  class User:
      username: str
      email: str
      age: int
      tags: list[str] = field(default_factory=list)
      is_active: bool = True

      def __post_init__(self):
          if self.age < 0:
              raise ValueError("Age cannot be negative")

ENUMS::[
  USE_FOR::fixed_sets_of_values,
  PATTERN::Enum_or_auto()_for_sequential
]

PATHLIB::[
  PREFER::Path_over_os.path,
  OPERATIONS::[exists(), read_text(), write_text(), /, glob()]
]

EXAMPLE_PATHLIB::
  from pathlib import Path
  data_dir = Path("/data")
  file_path = data_dir / "input.txt"
  if file_path.exists():
      content = file_path.read_text()

COMPREHENSIONS::[
  USE::clarity+performance,
  FORMAT::[x for x in items if condition]
]
```

---

## CODE ORGANIZATION

```octave
MODULE_STRUCTURE::[
  1::docstring[module_purpose],
  2::imports[stdlib→third_party→local],
  3::constants[UPPER_SNAKE_CASE],
  4::exceptions[custom_error_classes],
  5::functions[public_then_private],
  6::classes[organized_by_dependency],
  7::main[if __name__ == "__main__"]
]

AVOID_MAGIC_NUMBERS::[
  BAD::for attempt in range(3):  # What is 3?
  GOOD::MAX_RETRIES = 3; for attempt in range(MAX_RETRIES):
]
```

---

## TESTING (pytest)

```octave
PYTEST_PATTERN::[
  STRUCTURE::test_functions[test_verb_noun],
  FIXTURES::reusable_setup[@pytest.fixture],
  ASSERTIONS::pytest.raises[expected_exceptions],
  ORGANIZATION::tests/mirror_src/structure
]

EXAMPLE_TEST::
  import pytest
  from myapp.processor import DataProcessor

  def test_process_valid_data():
      processor = DataProcessor()
      result = processor.process([1, 2, 3])
      assert result == [2, 4, 6]

  def test_process_empty_raises():
      processor = DataProcessor()
      with pytest.raises(ValueError):
          processor.process([])

  @pytest.fixture
  def sample_data():
      return [1, 2, 3, 4, 5]
```

---

## KEY PRINCIPLES

```octave
PYTHON_PHILOSOPHY::[
  1::PEP8_compliance→consistent_style,
  2::type_hints→function_signatures_always,
  3::NumPy_docstrings→all_public_functions,
  4::specific_exceptions→not_bare_except,
  5::pathlib→over_os.path,
  6::dataclasses+enums→structured_data,
  7::comprehensions→readable_transformations,
  8::named_constants→no_magic_numbers,
  9::pytest→all_testing,
  10::modern_syntax→Python_3.9+_features
]
```
