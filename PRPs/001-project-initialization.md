# PRP-001: Project Initialization

## Status
🔲 Not Started

## Priority
P0 - Critical (Blocker for all other PRPs)

## Objective
Initialize the Next.js 14 project with TypeScript, configure essential development tools, and establish code quality standards.

## Scope

### Files to Create
- `next.config.js` - Next.js configuration
- `.eslintrc.json` - ESLint configuration
- `.prettierrc` - Prettier configuration
- `.prettierignore` - Prettier ignore patterns
- `.gitignore` - Git ignore patterns
- `.env.example` - Environment variable template
- `.husky/` - Git hooks for pre-commit checks
- `jest.config.js` - Jest configuration
- `jest.setup.js` - Jest setup file
- `.github/workflows/ci.yml` - CI/CD pipeline

### Dependencies to Install
```bash
npm install
```
(All dependencies are already listed in package.json)

## Implementation Steps

1. **Initialize Next.js Structure**
   - Create `src/app` directory structure
   - Create basic `layout.tsx` and `page.tsx`
   - Set up App Router architecture

2. **Configure ESLint**
   - Set up Airbnb base config
   - Add React hooks rules
   - Add accessibility (a11y) rules
   - Custom rules for project consistency

3. **Configure Prettier**
   - Set up formatting rules
   - Integrate with ESLint
   - Add pre-commit hooks

4. **Set Up Husky**
   - Install git hooks
   - Add pre-commit linting
   - Add pre-push test running

5. **Configure Jest**
   - Set up React Testing Library
   - Configure test environment
   - Add test utilities
   - Create example test

6. **Create GitHub Actions Workflow**
   - Lint on PR
   - Run tests on PR
   - Build check on PR

## Acceptance Criteria

- [ ] `npm run dev` starts development server successfully
- [ ] `npm run build` creates production build without errors
- [ ] `npm run lint` passes with zero errors
- [ ] `npm test` runs Jest tests successfully
- [ ] Pre-commit hook blocks commits with linting errors
- [ ] TypeScript strict mode is enabled and enforced
- [ ] All paths are configured correctly (`@/` imports work)

## Validation Steps

```bash
# 1. Install dependencies
npm install

# 2. Start dev server
npm run dev
# Visit http://localhost:3000 - should see Next.js welcome page

# 3. Run linter
npm run lint
# Should pass with no errors

# 4. Run tests
npm test
# Should pass (at least 1 basic test)

# 5. Build production
npm run build
# Should complete successfully

# 6. Test git hooks
git add .
git commit -m "test: verify husky hooks"
# Should run lint and block if errors exist
```

## Expected Output

```
✓ Next.js application running on http://localhost:3000
✓ TypeScript compiler with no errors
✓ ESLint passing with 0 warnings, 0 errors
✓ Jest running with 1 passing test
✓ Production build succeeds
✓ Git hooks active and functioning
```

## Files Modified
- `package.json` (already exists with correct dependencies)
- `tsconfig.json` (already exists with strict settings)

## Related PRPs
- Blocks: ALL (this must be completed first)
- Depends on: NONE

## Estimated Time
2-3 hours

## Notes
- Use Next.js 14 App Router (not Pages Router)
- Strict TypeScript settings already configured
- Follow conventional commits format
- Test with a simple "Hello World" page first

## Rollback Plan
If validation fails:
1. Check Node version (must be 20+)
2. Clear `node_modules` and `.next` directories
3. Run `npm install` again
4. Check for port conflicts (3000 must be available)
