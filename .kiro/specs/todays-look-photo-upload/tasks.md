# Implementation Plan: Today's Look Photo Upload

## Overview

This plan transforms the "Today's Look" page into a photo-upload-based outfit documentation feature. The existing AI outfit generation features relocate to a new "Styling" page at `/styling`. The implementation proceeds incrementally: shared types first, then backend (upload + vision + deduplication + data layer), then frontend (new page + relocated page + updated navigation + updated journey), and finally integration wiring.

## Tasks

- [x] 1. Add shared types and install multer
  - [x] 1.1 Add new shared types to `shared/src/index.ts`
    - Add `IdentifiedItem` interface (type, color, material)
    - Add `OutfitPhoto` interface (id, userId, photoUrl, wardrobeItemIds, occasionContext, note, createdAt)
    - Add `VisionAnalysisResult` interface (success, items, error)
    - Add `JourneyEntry` interface with `type: 'generated' | 'photo'` discriminator and union fields
    - _Requirements: 10.1_

  - [x] 1.2 Install multer and its types in the backend
    - Run `npm install multer` and `npm install -D @types/multer` in the backend package
    - _Requirements: 1.1_

- [x] 2. Create database migration for outfit_photos table
  - [x] 2.1 Create migration file `backend/src/db/migrations/002_create_outfit_photos.sql`
    - Create `outfit_photos` table with columns: id (UUID PK), user_id (UUID FK → users), photo_url (VARCHAR 2048), wardrobe_item_ids (UUID[]), occasion_context (VARCHAR 50), note (VARCHAR 280), created_at (TIMESTAMP)
    - Add index on (user_id, created_at)
    - Add index on (user_id, occasion_context)
    - _Requirements: 10.1, 10.2_

- [x] 3. Implement backend Vision Analyzer service
  - [x] 3.1 Create `backend/src/services/visionAnalyzer.ts`
    - Import OpenAI client and wardrobe vocabulary (KNOWN_TYPES, KNOWN_COLORS, KNOWN_MATERIALS) from wardrobeParser
    - Export the vocabulary arrays from wardrobeParser so they can be imported by the vision analyzer
    - Implement `analyzePhoto(imagePath: string): Promise<VisionAnalysisResult>` that reads the image file, sends it to GPT-4o vision with a structured prompt requesting JSON clothing identification, parses the response, and normalizes each item against the vocabulary
    - Implement `normalizeItem(raw: {type: string, color: string, material: string}): IdentifiedItem` that maps raw GPT-4o output to known vocabulary values (case-insensitive match, fallback to original value for type, "unknown" for unmatched color/material)
    - Handle API errors (timeout, rate limit, invalid JSON) with appropriate error responses
    - _Requirements: 2.1, 2.3_

  - [ ]* 3.2 Write property test for vision normalizer (Property 2)
    - **Property 2: Vision normalizer produces valid vocabulary values**
    - For any raw item with arbitrary type/color/material strings, the normalizer SHALL produce an IdentifiedItem where type is from KNOWN_TYPES or the original value, color is from KNOWN_COLORS or "unknown", material is from KNOWN_MATERIALS or "unknown"
    - **Validates: Requirements 2.3**

- [x] 4. Implement backend Deduplication service
  - [x] 4.1 Create `backend/src/services/deduplicationService.ts`
    - Implement `checkItems(userId: string, items: IdentifiedItem[]): Promise<DeduplicationResult>` that queries the user's wardrobe_items table and compares each identified item by type+color+material (case-insensitive strict equality)
    - Return `{ newItems: IdentifiedItem[], existingItems: ExistingItemMatch[] }` where ExistingItemMatch includes the matched wardrobeItemId
    - _Requirements: 3.1, 3.2, 3.3_

  - [ ]* 4.2 Write property test for deduplication correctness (Property 3)
    - **Property 3: Deduplication correctness**
    - For any set of IdentifiedItems and existing WardrobeItems, the service classifies each item as "existing" iff a WardrobeItem matches on type+color+material (case-insensitive), and "new" otherwise. The union of new + existing equals the original set with no items lost or duplicated.
    - **Validates: Requirements 3.1, 3.2, 3.3**

- [x] 5. Implement backend photo upload and save endpoints
  - [x] 5.1 Create `backend/src/services/fileValidator.ts`
    - Implement file validation: accept only image/jpeg, image/png, image/webp MIME types and file size ≤ 10 MB
    - Return appropriate error messages for invalid format or size
    - _Requirements: 1.3, 1.4, 1.5_

  - [ ]* 5.2 Write property test for file upload validation (Property 1)
    - **Property 1: File upload validation**
    - For any file with a MIME type and size, the validator accepts iff MIME is one of image/jpeg, image/png, image/webp AND size ≤ 10 MB. All other combinations are rejected.
    - **Validates: Requirements 1.3, 1.4, 1.5**

  - [x] 5.3 Create `backend/src/db/repositories/outfitPhotoRepository.ts`
    - Implement `create(outfitPhoto)` to INSERT into outfit_photos
    - Implement `findById(id, userId)` to SELECT with wardrobe item details
    - Implement `findByUser(userId, occasionContext?)` to SELECT with optional filter, ordered by created_at DESC
    - _Requirements: 10.1, 10.3, 10.4_

  - [ ]* 5.4 Write property test for outfit photo round-trip (Property 6)
    - **Property 6: Outfit photo data round-trip**
    - For any valid OutfitPhoto record, saving and then retrieving by ID produces an OutfitPhoto with all fields matching the original values.
    - **Validates: Requirements 6.4, 7.1, 10.1, 10.4**

  - [x] 5.5 Create `backend/src/routes/photos.ts` with upload and save endpoints
    - `POST /api/photos/upload`: Use multer for multipart file handling, validate file (format + size), save to `uploaded-photos/` directory, call visionAnalyzer.analyzePhoto, return `{ photoUrl, items }`
    - `POST /api/photos/save`: Validate request body (occasionContext required, note ≤ 280 chars), call deduplicationService.checkItems, insert new wardrobe items, create outfit_photo record, return `{ outfitPhoto, newItemCount }`
    - `GET /api/photos/:id`: Return outfit photo detail with resolved wardrobe items
    - Register the photos router in `backend/src/routes/index.ts`
    - Serve `uploaded-photos/` directory via Express static middleware in `backend/src/index.ts`
    - _Requirements: 1.1, 1.6, 2.1, 2.4, 2.5, 3.2, 3.5, 5.2, 6.2, 6.3, 7.1, 7.6_

  - [ ]* 5.6 Write property test for save payload validation (Property 5)
    - **Property 5: Save payload validation**
    - For any save request: reject if no OccasionContext provided; reject if note > 280 chars; accept if valid OccasionContext and note ≤ 280 chars (or no note).
    - **Validates: Requirements 5.2, 6.2, 6.3**

- [x] 6. Update backend Outfit Journey endpoint to merge photo entries
  - [x] 6.1 Modify `GET /api/outfits/saved` to query both `saved_outfits` and `outfit_photos`
    - Query both tables for the user, merge results chronologically (most recent first)
    - Add `type: 'generated' | 'photo'` discriminator to each entry
    - For photo entries, include photoUrl and wardrobeItems array
    - Support existing `occasionContext` filter query param across both types
    - _Requirements: 7.2, 7.5_

  - [ ]* 6.2 Write property test for timeline chronological ordering (Property 7)
    - **Property 7: Timeline chronological ordering**
    - For any set of OutfitPhotos and SavedOutfits with varying timestamps, the merged timeline orders all entries by date descending within each month group, and month groups are ordered most recent first.
    - **Validates: Requirements 7.2**

  - [ ]* 6.3 Write property test for occasion context filter correctness (Property 8)
    - **Property 8: Occasion context filter correctness**
    - For any set of entries with mixed OccasionContexts and any selected filter, the filtered result contains only entries matching the filter. When no filter is applied, all entries are returned.
    - **Validates: Requirements 7.5**

- [x] 7. Checkpoint - Backend complete
  - Ensure all backend tests pass, ask the user if questions arise.

- [x] 8. Implement frontend navigation restructure and Styling page
  - [x] 8.1 Create `frontend/src/pages/Styling.tsx` by relocating existing TodaysLook content
    - Copy the current `TodaysLook.tsx` content into a new `Styling.tsx` page component
    - Update the page heading from "Today's Look" to "Styling"
    - Keep all existing functionality intact (ContextToggle, AvatarCard, AccessoryPromptInput, AccessoryShelf, SuggestionPanel, SaveButton, modals)
    - _Requirements: 9.1, 9.2, 9.3_

  - [x] 8.2 Update `frontend/src/components/Navbar.tsx` to add Styling link
    - Add `{ to: '/styling', label: 'Styling' }` between Today's Look and My Wardrobe in navItems
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

  - [x] 8.3 Update `frontend/src/App.tsx` routing
    - Import the new Styling page component
    - Add route `<Route path="/styling" element={<Styling />} />`
    - The `/` route will be updated to the new TodaysLook page in a later task
    - _Requirements: 8.2, 8.3_

- [x] 9. Implement frontend Today's Look photo upload page
  - [x] 9.1 Create `frontend/src/components/upload/PhotoUploadArea.tsx`
    - Implement drag-and-drop zone and file picker button
    - Add `capture="environment"` attribute on the file input for mobile camera support
    - Client-side validation: check MIME type (jpeg, png, webp) and file size (≤ 10 MB) before upload
    - Display inline error messages for invalid format or size
    - _Requirements: 1.1, 1.3, 1.4, 1.5_

  - [x] 9.2 Create `frontend/src/components/upload/PhotoPreview.tsx`
    - Display the uploaded photo as a preview image
    - Show loading spinner overlay while vision analysis is in progress
    - _Requirements: 1.2, 1.6_

  - [x] 9.3 Create `frontend/src/components/upload/IdentifiedItemCard.tsx`
    - Display a single identified item with type, color, material fields
    - Show "New" badge for items not in wardrobe, "Existing" badge for matches
    - Provide edit button that reveals inline editable fields (type, color, material)
    - Provide remove button (X) to exclude the item
    - _Requirements: 2.2, 3.4, 4.1, 4.2_

  - [x] 9.4 Create `frontend/src/components/upload/IdentifiedItemList.tsx`
    - Render list of IdentifiedItemCard components
    - Display count of newly added items
    - Handle item removal (filter from list) and item editing (update values in state)
    - _Requirements: 2.2, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4_

  - [ ]* 9.5 Write property test for item removal exclusion (Property 4)
    - **Property 4: Item removal exclusion**
    - For any list of IdentifiedItems and any subset marked for removal, the save payload contains exactly the items NOT in the removal subset, preserving order and field values.
    - **Validates: Requirements 4.3**

  - [x] 9.6 Create `frontend/src/components/upload/OccasionSelector.tsx`
    - Display three chip buttons: Work, Casual, Night Out
    - Highlight the selected chip, allow exactly one selection
    - _Requirements: 5.1, 5.2, 5.3_

  - [x] 9.7 Create `frontend/src/components/upload/NoteInput.tsx`
    - Text input field with 280 character limit
    - Display remaining character count
    - Prevent submission when exceeding 280 characters (disable save, show red counter)
    - _Requirements: 6.1, 6.2, 6.3_

  - [x] 9.8 Create `frontend/src/components/upload/SavePhotoButton.tsx`
    - Disabled until occasion is selected and at least one item remains
    - On click, POST to `/api/photos/save` with photoUrl, items (after edits/removals), occasionContext, and note
    - Display confirmation message on success and reset the page for a new upload
    - _Requirements: 7.1, 7.6_

  - [x] 9.9 Rewrite `frontend/src/pages/TodaysLook.tsx` as the photo upload page
    - Replace existing content with the new photo upload flow
    - Compose: PhotoUploadArea → PhotoPreview → IdentifiedItemList → OccasionSelector → NoteInput → SavePhotoButton
    - Manage state: selected file, photo URL, identified items, edits, removals, occasion, note, loading, errors
    - Call `POST /api/photos/upload` on file selection, display results
    - Handle error states: no items detected (show message + retry), API error (show error + retry)
    - _Requirements: 1.1, 1.2, 1.6, 2.2, 2.4, 2.5_

- [x] 10. Update Outfit Journey to display photo entries
  - [x] 10.1 Update `frontend/src/components/journey/OutfitCard.tsx` to handle photo entries
    - Check `type` field discriminator ('generated' vs 'photo')
    - For photo entries: display uploaded photo thumbnail, occasion badge, date, note excerpt
    - For generated entries: keep existing display logic
    - On expand for photo entries: show full-size photo, all associated clothing items, complete note
    - _Requirements: 7.2, 7.3, 7.4, 7.5_

  - [x] 10.2 Update `frontend/src/pages/OutfitJourney.tsx` to handle merged timeline data
    - Update TypeScript types to use the new `JourneyEntry` union type
    - Ensure filter chips work across both entry types
    - _Requirements: 7.2, 7.5_

  - [ ]* 10.3 Write property test for outfit photo card rendering (Property 9)
    - **Property 9: Outfit photo card renders required fields**
    - For any OutfitPhoto with photoUrl, occasionContext, createdAt, and optional note, the rendered card contains: photo thumbnail, occasion badge, formatted date, and note excerpt (if present).
    - **Validates: Requirements 7.3**

  - [ ]* 10.4 Write property test for resolved wardrobe items (Property 10)
    - **Property 10: Retrieved outfit photo includes resolved wardrobe items**
    - For any OutfitPhoto with N wardrobe item IDs referencing existing WardrobeItems, retrieving the detail returns exactly N wardrobe item objects with matching id, type, color, material.
    - **Validates: Requirements 10.3**

- [x] 11. Update Vite config for mobile access
  - [x] 11.1 Update `frontend/vite.config.ts` to add `server: { host: true }`
    - This enables network access so the app can be tested from mobile devices on the same network
    - _Requirements: 1.1_

- [x] 12. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The project uses TypeScript throughout (React + Tailwind frontend, Node.js/Express backend)
- fast-check is already available in both frontend and backend devDependencies
- multer is needed for multipart file upload handling (installed in task 1.2)
- Photos are stored locally in `uploaded-photos/` directory, served via Express static middleware
