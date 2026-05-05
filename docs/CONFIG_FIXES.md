# Configuration Fixes

## DA-076: Include test files in type checking
In `tsconfig.json`, remove `tests/` from `exclude` array to catch type errors in tests.

## DA-077: Reduce credential surface in .env.example
Remove actual credential patterns from .env.example. Use `YOUR_KEY_HERE` placeholders only.
Strip comments that reveal internal architecture.
