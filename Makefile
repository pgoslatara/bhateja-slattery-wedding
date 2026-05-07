.DEFAULT_GOAL := help

PORT ?= 4321
HOST ?= 0.0.0.0

help:        ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) \
	  | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

setup:       ## Install all dependencies (run once after clone)
	@command -v node >/dev/null || (echo "Node.js required (see .node-version)"; exit 1)
	npm ci
	npx husky init || true

dev:         ## Run Astro dev server with HMR
	npm run dev -- --host $(HOST) --port $(PORT)

build:       ## Production build to ./dist
	npm run i18n:check
	npx astro check
	npm run build

preview: build  ## Build and serve the production output locally
	npm run preview -- --host $(HOST) --port $(PORT)

serve: preview  ## Alias for preview

check:       ## Run all checks (i18n parity, content schemas, types, tests)
	npm run i18n:check
	npx astro check
	npm test

rehash:      ## Bump enHash. Usage: make rehash NAME=01-mehendi
	npm run i18n:rehash -- $(NAME)

script-push: ## Push Apps Script via clasp
	npm run script:push

script-open: ## Open Apps Script editor for manual deploy
	npm run script:open

clean:       ## Remove build artifacts and node_modules
	rm -rf dist node_modules .astro

.PHONY: help setup dev build preview serve check rehash script-push script-open clean
