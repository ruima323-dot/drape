# Implementation Plan: Drape Style Discovery

## Overview

This plan implements the Drape MVP in incremental steps: project scaffolding, data layer, backend services (parser, generator, compositor, recommendations), REST API, frontend pages, and integration wiring. Each task builds on the previous, and property-based tests are placed close to the code they validate. The stack is React + Tailwind CSS (frontend), Node.js/FastAPI (backend), PostgreSQL, S3, Amazon Titan Image Generator via AWS Bedrock, and Supabase Auth / Cognito.

## Tasks

- [ ] 1. Set up project structure, tooling, and shared types
  - [ ] 1.1 Initialize monorepo with frontend (React + Tailwind CSS + Vite) and backend (Node.js + TypeScript) packages
    - Configure TypeScript, ESLint, Prettier across both packages
    - Install shared dependencies: `uuid`, `zod` for validation
    - Set up `fast-check` as a dev dependency for property-based testing
    - Set up a test runner (Vitest) for both packages
    - _Requirements: N/A (infrastructure)_

  - [ ] 1.2 Define shared TypeScript types and interfaces
    - Create `WardrobeItem`, `Accessory`, `OccasionContext`, `AvatarConfig`, `StyleProfile`, `GeneratedOutfit`, `SavedOutfit`, `AccessoryLayerState`, `AccessoryPlacement`, `ParseResult`, `ParseError` types as specified in the design
    - Create `AccessorySuggestion`, `CompositeParams`, `CompositeResult`, `RemoveParams`, `ToggleParams` types
    - Place shared types in a common package or shared directory accessible by both frontend and backend
    - _Requirements: 1.1, 4.1, 6.1, 9.3_

- [ ] 2. Implement database schema and data access layer
  - [ ] 2.1 Create PostgreSQL migration scripts for all tables
    - Create `users` table with `id`, `email`, `name`, `avatar_config` (JSONB), `style_profile` (JSONB), `created_at`, `updated_at`
    - Create `wardrobe_items` table with `id`, `user_id`, `type`, `color`, `material`, `fit`, `occasions` (TEXT[]), `image_url`, `created_at`
    - Create `accessories` table with `id`, `user_id`, `type`, `color`, `material`, `label`, `emoji`, `image_url`, `created_at`
    - Create `generated_outfits` table with `id`, `user_id`, `occasion_context`, `wardrobe_item_ids` (UUID[]), `accessory_ids` (UUID[]), `accessory_layer_state` (JSONB), `image_url`, `avatar_image_url`, `created_at`
    - Create `saved_outfits` table with `id`, `user_id`, `generated_outfit_id`, `name`, `note` (VARCHAR 280), `saved_at`
    - Add indexes on `wardrobe_items(user_id)`, `accessories(user_id)`, `generated_outfits(user_id, created_at)`, `saved_outfits(user_id, saved_at)`, `saved_outfits(user_id, occasion_context)`
    - _Requirements: 1.4, 9.3_

  - [ ] 2.2 Implement data access functions (repository layer)
    - Create CRUD functions for `WardrobeItem`: create, list by user, delete by ID
    - Create CRUD functions for `Accessory`: create, list by user, delete by ID
    - Create functions for `GeneratedOutfit`: create, get by ID, list by user
    - Create functions for `SavedOutfit`: create, get by ID, list by user with optional `occasion_context` filter, list by user grouped by month
    - Create functions for `User`: get by ID, update avatar config, update style profile
    - Add server-side validation: reject `note` longer than 280 characters on `SavedOutfit` create
    - _Requirements: 1.4, 2.1, 7.4, 9.3, 9.7, 10.1, 10.4_

- [ ] 3. Implement Wardrobe Parser
  - [ ] 3.1 Implement `parseWardrobe` function
    - Parse plain text descriptions into one or more `WardrobeItem` objects with `type`, `color`, `material`, `fit`, and `occasions` fields
    - Handle multi-item descriptions by splitting on sentence boundaries, commas, or line breaks
    - Return `ParseResult<WardrobeItem[]>` with `success: true` and parsed items, or `success: false` with `ParseError[]` identifying unparseable segments with position offsets
    - _Requirements: 1.1, 1.2, 1.3_

  - [ ] 3.2 Implement `parseAccessoryPrompt` function
    - Parse a natural language accessory prompt (e.g., "add gold hoop earrings") into a single `Accessory` definition with `type`, `color`, and `material`
    - Return `ParseResult<Accessory>` with error details if the prompt cannot be interpreted as an accessory
    - _Requirements: 6.1, 6.6_

  - [ ] 3.3 Implement `formatWardrobeItem` and `formatAccessory` functions
    - Convert a `WardrobeItem` back to a canonical text representation
    - Convert an `Accessory` back to a canonical text representation
    - These functions support round-trip testing
    - _Requirements: 1.5, 6.7_

  - [ ]* 3.4 Write property test: Wardrobe parse round-trip (Property 1)
    - **Property 1: Wardrobe parse round-trip**
    - For any valid WardrobeItem, `parseWardrobe(formatWardrobeItem(item))` should produce an equivalent WardrobeItem
    - Use fast-check generators for random WardrobeItem objects (type from enum, random color/material/fit strings, random occasion subsets)
    - **Validates: Requirements 1.5**

  - [ ]* 3.5 Write property test: Accessory parse round-trip (Property 2)
    - **Property 2: Accessory parse round-trip**
    - For any valid Accessory, `parseAccessoryPrompt(formatAccessory(accessory))` should produce an equivalent Accessory
    - Use fast-check generators for random Accessory objects (type from enum, random color/material strings)
    - **Validates: Requirements 6.7**

  - [ ]* 3.6 Write property test: Parser produces structured items (Property 3)
    - **Property 3: Wardrobe parser produces structured items**
    - For any valid multi-item text description containing N items, the parser should produce exactly N WardrobeItems each with non-empty type, color, material, fit, and occasions
    - **Validates: Requirements 1.1, 1.2**

  - [ ]* 3.7 Write property test: Parser error reporting (Property 4)
    - **Property 4: Parser error reporting for invalid inputs**
    - For any text that does not contain a valid clothing or accessory description, the parser should return a ParseError with the unparseable segment and position
    - Use fast-check generators for random non-clothing strings, gibberish, numbers, special characters
    - **Validates: Requirements 1.3, 6.6**

- [ ] 4. Checkpoint — Ensure parser tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Implement Outfit Generator
  - [ ] 5.1 Implement prompt builder
    - Build an image generation prompt string from `WardrobeItem[]`, `OccasionContext`, `AvatarConfig`, and optional `StyleProfile`
    - Filter wardrobe items to only those whose `occasions` array includes the selected context
    - Include avatar body type and skin tone in the prompt
    - Apply occasion-specific prompt modifiers (e.g., professional lighting for Work, relaxed setting for Casual, dramatic lighting for Night Out)
    - _Requirements: 4.1, 4.2, 5.3_

  - [ ]* 5.2 Write property test: Occasion-appropriate item selection (Property 5)
    - **Property 5: Outfit prompt selects occasion-appropriate wardrobe items**
    - For any set of WardrobeItems with tagged occasions and any OccasionContext, the prompt should only reference items whose occasions include the selected context
    - **Validates: Requirements 4.1**

  - [ ]* 5.3 Write property test: Avatar config in prompts (Property 6)
    - **Property 6: Avatar configuration is always included in generation prompts**
    - For any AvatarConfig and OccasionContext, the generated prompt should contain the avatar's body type and skin tone
    - **Validates: Requirements 4.2, 5.3**

  - [ ] 5.4 Implement AWS Bedrock integration for image generation
    - Create a service that sends the constructed prompt to AWS Bedrock using the Amazon Titan Image Generator model via the `InvokeModel` API
    - Configure the AWS SDK with Bedrock runtime client and appropriate region
    - Handle API responses: decode base64 image from the Bedrock response body
    - Implement retry with exponential backoff (max 3 attempts) for timeouts and throttling
    - _Requirements: 4.1_

  - [ ] 5.5 Implement S3 image storage integration
    - Upload generated images to S3 with appropriate key structure (`outfits/{user_id}/{outfit_id}.png`)
    - Return the S3 URL for storage in the database
    - Implement retry (max 2 attempts) for upload failures
    - _Requirements: 4.1_

  - [ ] 5.6 Wire `generateOutfit` end-to-end
    - Implement the `OutfitGenerator.generateOutfit` method that orchestrates: prompt building → Bedrock API call → S3 upload → database record creation
    - Return a `GeneratedOutfit` with all metadata
    - _Requirements: 4.1, 4.2, 4.3_

- [ ] 6. Implement Accessory Compositor
  - [ ] 6.1 Implement `addAccessory` function
    - Fetch the base outfit image from S3
    - Layer the accessory image onto the base image at a default position based on accessory type (earrings → ear area, necklace → neck area, etc.)
    - Upload the composited image to S3
    - Return the new image URL and updated `AccessoryLayerState`
    - Preserve the base outfit image URL unchanged
    - _Requirements: 6.2, 6.3_

  - [ ] 6.2 Implement `removeAccessory` function
    - Rebuild the composited image from the base image and remaining active accessories (excluding the removed one)
    - Upload the updated composited image to S3
    - Return the new image URL and updated `AccessoryLayerState`
    - Preserve the base outfit image URL unchanged
    - _Requirements: 6.5_

  - [ ] 6.3 Implement `toggleAccessory` function
    - If the accessory is active, call `removeAccessory`; if inactive, call `addAccessory`
    - Return the updated `CompositeResult`
    - _Requirements: 7.2_

  - [ ]* 6.4 Write property test: Base image invariant (Property 7)
    - **Property 7: Base image invariant across accessory operations**
    - For any base image URL and any sequence of add/remove operations, the base outfit image URL should remain unchanged
    - **Validates: Requirements 6.2, 6.3, 6.5**

  - [ ]* 6.5 Write property test: Accessory toggle round-trip (Property 8)
    - **Property 8: Accessory toggle is a round-trip**
    - For any accessory and any AccessoryLayerState, toggling on then toggling off should return the layer to its original state
    - **Validates: Requirements 7.2**

- [ ] 7. Checkpoint — Ensure compositor and generator tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Implement Recommendation Engine
  - [ ] 8.1 Implement `suggestAccessories` function
    - Accept current outfit, occasion context, wardrobe color palette, user accessories, accessory history, and optional style profile
    - Generate accessory suggestions that complement the outfit based on color harmony, occasion appropriateness, and usage history
    - Include a non-empty explanation string for each suggestion
    - Mark each suggestion with `owned: true/false` based on user's accessory collection
    - _Requirements: 8.1, 8.4_

  - [ ]* 8.2 Write property test: Suggestions contextual and explained (Property 10)
    - **Property 10: Accessory suggestions are contextual and explained**
    - For any outfit, OccasionContext, and color palette, every suggestion should include a non-empty explanation and be contextually appropriate
    - **Validates: Requirements 8.1, 8.4**

- [ ] 9. Implement REST API endpoints
  - [ ] 9.1 Set up API server with authentication middleware
    - Configure Node.js/Express or FastAPI server
    - Integrate Supabase Auth or Cognito for JWT validation middleware
    - Set up CORS for the Vercel frontend origin
    - Implement user extraction from auth token for all protected routes
    - _Requirements: N/A (infrastructure)_

  - [ ] 9.2 Implement wardrobe API endpoints
    - `POST /api/wardrobe/parse` — accept plain text, call Wardrobe Parser, return parsed items or errors
    - `GET /api/wardrobe` — list user's wardrobe items
    - `POST /api/wardrobe/items` — store parsed wardrobe items in database
    - `DELETE /api/wardrobe/items/:id` — remove a wardrobe item
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1_

  - [ ] 9.3 Implement outfit generation and saving API endpoints
    - `POST /api/outfits/generate` — accept `{ occasionContext }`, fetch user wardrobe + avatar config, call Outfit Generator, return outfit image + metadata
    - `POST /api/outfits/save` — accept `{ generatedOutfitId, name?, note? }`, validate note ≤280 chars, store SavedOutfit, return saved record
    - `GET /api/outfits/saved` — list saved outfits with optional `occasionContext` filter, grouped by month for timeline
    - `GET /api/outfits/saved/:id` — get full saved outfit detail including wardrobe items, accessories, and note
    - _Requirements: 4.1, 4.3, 9.1, 9.2, 9.3, 9.7, 10.1, 10.4_

  - [ ] 9.4 Implement accessory API endpoints
    - `POST /api/accessories/parse` — accept accessory prompt text, call parser, return parsed accessory or error
    - `POST /api/accessories/composite` — accept `{ outfitId, accessoryId, action: 'add' | 'remove' | 'toggle' }`, call Accessory Compositor, return updated image + metadata
    - `GET /api/accessories` — list user's saved accessories
    - `GET /api/recommendations/accessories` — accept `{ outfitId }`, call Recommendation Engine, return suggestions
    - _Requirements: 6.1, 6.2, 6.5, 7.1, 7.2, 7.4, 8.1_

  - [ ] 9.5 Implement user profile API endpoints
    - `PUT /api/users/avatar` — accept `{ bodyType, skinTone }`, update user's avatar config
    - `POST /api/users/style-profile` — accept questionnaire responses, store as style profile
    - _Requirements: 5.1, 5.2, 3.1, 3.2_

  - [ ]* 9.6 Write property test: Saved outfit data round-trip (Property 11)
    - **Property 11: Saved outfit data round-trip**
    - For any valid outfit state, saving and then retrieving should produce a SavedOutfit with all fields matching the original
    - **Validates: Requirements 9.3**

  - [ ]* 9.7 Write property test: Personal note length validation (Property 12)
    - **Property 12: Personal note length validation**
    - For any string >280 chars, save should reject. For any string ≤280 chars (including empty), save should accept.
    - **Validates: Requirements 9.7**

- [ ] 10. Checkpoint — Ensure all backend tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11. Implement frontend design system and layout
  - [ ] 11.1 Configure Tailwind theme with Drape design tokens
    - Set up quiet luxury color palette: warm creams, charcoal, gold accents
    - Configure fonts: Cormorant Garamond for display headings, DM Sans for UI text
    - Define spacing, border radius, and shadow tokens for card components
    - Create reusable Tailwind utility classes for occasion-context color shifts (Work, Casual, Night Out)
    - _Requirements: 4.5_

  - [ ] 11.2 Implement App Shell with routing and auth
    - Create the main App component with React Router
    - Set up routes: `/` (Today's Look), `/wardrobe` (My Wardrobe), `/journey` (Outfit Journey)
    - Implement navigation bar with links to all three pages
    - Integrate auth provider (Supabase Auth or Cognito) with login/signup flow
    - Protect routes behind authentication
    - _Requirements: N/A (infrastructure)_

- [ ] 12. Implement My Wardrobe page
  - [ ] 12.1 Build TextInput component for wardrobe entry
    - Create a multi-line text input with placeholder text guiding the user (e.g., "Describe your clothes: navy slim-fit cotton shirt, black relaxed linen pants...")
    - Add a submit button that calls `POST /api/wardrobe/parse`
    - Display inline error highlighting for unparseable segments from `ParseError[]`
    - On successful parse, call `POST /api/wardrobe/items` to store items and update the grid
    - _Requirements: 1.1, 1.2, 1.3, 2.3_

  - [ ] 12.2 Build WardrobeGrid and WardrobeItemCard components
    - Create a responsive grid layout displaying all wardrobe items
    - Each `WardrobeItemCard` displays type, color, and material as visible text
    - Support delete action on each card
    - Fetch items from `GET /api/wardrobe` on page load
    - _Requirements: 2.1, 2.2_

  - [ ] 12.3 Build empty state for zero wardrobe items
    - Display a friendly empty state with illustration and prompt to add items via text input
    - _Requirements: 2.4_

  - [ ]* 12.4 Write property test: Wardrobe item card renders required fields (Property 17)
    - **Property 17: Wardrobe item card renders required fields**
    - For any WardrobeItem, the rendered card should contain type, color, and material as visible text
    - **Validates: Requirements 2.2**

- [ ] 13. Implement Today's Look page — Outfit Generation
  - [ ] 13.1 Build ContextToggle component
    - Create a toggle group with three options: Work, Casual, Night Out
    - Display the active context as an overlay label on the AvatarCard
    - On context switch, call `POST /api/outfits/generate` with the selected context
    - _Requirements: 4.1, 4.3, 4.4_

  - [ ] 13.2 Build AvatarCard component
    - Display the generated outfit image on the avatar card
    - Shift background and color palette based on active OccasionContext
    - Show loading state while outfit is being generated
    - Display accessory badges as overlays with tap-to-remove interaction
    - _Requirements: 4.2, 4.4, 4.5, 6.4_

  - [ ] 13.3 Build Avatar configuration UI
    - Create a settings panel or modal for configuring body type and skin tone
    - Call `PUT /api/users/avatar` on save
    - Persist configuration so it applies to all subsequent outfit generations
    - _Requirements: 5.1, 5.2_

  - [ ] 13.4 Build Style Questionnaire flow
    - Create a short questionnaire UI presented during onboarding or accessible from settings
    - Submit responses via `POST /api/users/style-profile`
    - Store as the user's Style_Profile for influencing generation and recommendations
    - _Requirements: 3.1, 3.2, 3.3_

- [ ] 14. Implement Today's Look page — Accessory Features
  - [ ] 14.1 Build AccessoryPromptInput component
    - Create a text input for natural language accessory prompts (e.g., "add gold hoop earrings")
    - On submit, call `POST /api/accessories/parse` then `POST /api/accessories/composite`
    - Display error message if the prompt cannot be interpreted as an accessory
    - On success, save the accessory to the shelf via the API and update the avatar display
    - _Requirements: 6.1, 6.2, 6.6, 7.4_

  - [ ] 14.2 Build AccessoryShelf component
    - Display all user's saved accessories in a panel
    - Each accessory shows its emoji and label
    - Visually indicate which accessories are currently active in the outfit
    - On tap, call `POST /api/accessories/composite` with `action: 'toggle'` to toggle the accessory on/off
    - _Requirements: 7.1, 7.2, 7.3_

  - [ ] 14.3 Build SuggestionPanel component
    - Fetch accessory suggestions from `GET /api/recommendations/accessories`
    - Display suggestions below the AccessoryShelf with explanation text
    - On selecting a suggestion, call the composite endpoint to add it to the outfit
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [ ]* 14.4 Write property test: Accessory display state consistency (Property 9)
    - **Property 9: Accessory display state consistency**
    - For any set of accessories and active IDs, the shelf and avatar card should display exactly the active accessories with active indicators
    - **Validates: Requirements 6.4, 7.1, 7.3**

- [ ] 15. Implement Today's Look page — Save Outfit
  - [ ] 15.1 Build SaveButton and save flow
    - Display a save button on the outfit card
    - On tap, show a modal/prompt for optional Personal_Note (max 280 characters)
    - Enforce character limit client-side with counter and warning
    - On confirm, call `POST /api/outfits/save`
    - Show confirmation toast on success
    - Change button state to "✓ Saved" after successful save
    - Reset button to default unsaved state when the outfit is modified after saving
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7_

- [ ] 16. Checkpoint — Ensure Today's Look and Wardrobe pages work end-to-end
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 17. Implement Outfit Journey page
  - [ ] 17.1 Build Timeline component with monthly grouping
    - Fetch saved outfits from `GET /api/outfits/saved`
    - Group outfits by month/year with month and year headers
    - Order outfits within each month with most recent first
    - Support scrolling through monthly groupings
    - _Requirements: 10.1, 11.1, 11.2, 11.3_

  - [ ] 17.2 Build FilterChips component
    - Create filter chips: All, Work, Casual, Night Out
    - On selection, re-fetch or filter saved outfits by occasion context
    - "All" shows all outfits regardless of context
    - _Requirements: 10.3, 10.4, 10.5_

  - [ ] 17.3 Build OutfitCard and OutfitDetailExpanded components
    - Each OutfitCard displays: mini avatar thumbnail, OccasionContext badge, accessory emojis, date, and Personal_Note excerpt
    - On tap, expand the card to show full-size avatar image, all wardrobe items, all accessories, and complete Personal_Note
    - _Requirements: 10.2, 10.7_

  - [ ] 17.4 Build empty state for zero saved outfits
    - Display a friendly empty state with a call-to-action directing the user to create and save an outfit
    - _Requirements: 10.6_

  - [ ]* 17.5 Write property test: Timeline grouping and ordering (Property 13)
    - **Property 13: Timeline grouping and chronological ordering**
    - For any set of SavedOutfits with varying timestamps, the timeline should group by month, display headers, and order most recent first within each month
    - **Validates: Requirements 10.1, 11.2, 11.3**

  - [ ]* 17.6 Write property test: Outfit card renders required fields (Property 14)
    - **Property 14: Outfit card renders required fields**
    - For any SavedOutfit, the rendered card should contain mini avatar thumbnail, OccasionContext badge, accessory emojis, date, and Personal_Note excerpt
    - **Validates: Requirements 10.2**

  - [ ]* 17.7 Write property test: Occasion context filter correctness (Property 15)
    - **Property 15: Occasion context filter correctness**
    - For any set of SavedOutfits with mixed contexts and any filter, the result should contain only matching outfits. "All" returns everything.
    - **Validates: Requirements 10.4, 10.5**

- [ ] 18. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP delivery
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key milestones
- Property tests validate universal correctness properties from the design document using fast-check
- Unit tests validate specific examples and edge cases
- The implementation uses TypeScript throughout, matching the design document interfaces
- Requirements 12 (Purchase-Linked Recommendations) and 13 (Proactive Daily Suggestions) are deferred to v2 per MVP scope
