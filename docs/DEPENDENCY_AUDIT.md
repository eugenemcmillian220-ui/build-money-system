# DA-074: Dependency Audit Notes

## Recommendations
1. Run `npx depcheck` to identify unused dependencies
2. Remove `pg` (direct PostgreSQL driver) if only using Supabase client — redundant
3. Consider tree-shaking heavy deps: replace full lodash with lodash-es
4. Run `npm audit` regularly and pin versions
5. Move dev-only deps to devDependencies if not already
