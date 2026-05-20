# Requirements Document

## Introduction

This feature restructures the Drape app's "Today's Look" page from an AI outfit generation tool into a photo-upload-based outfit documentation feature. Users upload a photo of themselves wearing today's outfit, and the app uses AI vision (OpenAI GPT-4o) to identify clothing items in the photo, automatically adds new items to the wardrobe, and saves the photo as a dated entry in the Outfit Journey timeline. The existing AI outfit generation, accessory pairing, and suggestion features move to a new "Styling" page. The navigation restructures from three tabs (Today's Look | My Wardrobe | Outfit Journey) to four tabs (Today's Look | Styling | My Wardrobe | Outfit Journey).

## Glossary

- **Drape_App**: The Drape style discovery web application
- **User**: A person who has registered and authenticated with Drape_App
- **Photo_Upload**: An image file submitted by the User depicting themselves wearing an outfit, accepted via camera capture or file picker
- **Vision_Analyzer**: The AI vision component of Drape_App that uses OpenAI GPT-4o to identify clothing items from a Photo_Upload
- **Identified_Item**: A clothing item detected by the Vision_Analyzer from a Photo_Upload, containing type, color, and material fields
- **Wardrobe_Item**: A single clothing item stored as structured data containing item identifier, type, color, material, fit, and associated occasions
- **Outfit_Photo**: A dated record containing the User's uploaded photo, identified clothing items, occasion context, optional personal note, and timestamp
- **Occasion_Context**: One of three predefined styling contexts: Work, Casual, or Night Out
- **Personal_Note**: An optional text annotation (maximum 280 characters) attached to an Outfit_Photo describing context or thoughts about the outfit
- **Outfit_Journey**: A chronological timeline view of all saved Outfit_Photos and Saved_Outfits grouped by month
- **Styling_Page**: The page containing AI outfit generation, accessory pairing, context toggle, and suggestion features (relocated from the former Today's Look page)
- **Navigation_Bar**: The primary navigation component of Drape_App displaying page links
- **Deduplication_Check**: The process of comparing an Identified_Item against existing Wardrobe_Items to determine whether the item already exists in the User's wardrobe

## Requirements

### Requirement 1: Photo Upload Interface

**User Story:** As a user, I want to upload a photo of myself wearing today's outfit so I can document what I actually wore.

#### Acceptance Criteria

1. WHEN a User navigates to the Today's Look page, THE Drape_App SHALL display a photo upload area that accepts image files via file picker or camera capture.
2. WHEN a User selects or captures a photo, THE Drape_App SHALL display a preview of the uploaded photo before processing.
3. THE Drape_App SHALL accept image files in JPEG, PNG, and WebP formats.
4. IF a User submits a file that is not a valid image format (JPEG, PNG, or WebP), THEN THE Drape_App SHALL display an error message indicating the accepted file formats.
5. IF a User submits an image file exceeding 10 MB in size, THEN THE Drape_App SHALL display an error message indicating the maximum file size.
6. WHEN a User uploads a valid photo, THE Drape_App SHALL display a loading indicator while the Vision_Analyzer processes the image.

### Requirement 2: AI Clothing Recognition

**User Story:** As a user, I want the app to automatically identify the clothing items in my photo so I don't have to describe them manually.

#### Acceptance Criteria

1. WHEN a User uploads a valid photo, THE Vision_Analyzer SHALL analyze the image and identify all visible clothing items, extracting type, color, and material for each Identified_Item.
2. WHEN the Vision_Analyzer completes analysis, THE Drape_App SHALL display the list of Identified_Items below the uploaded photo with type, color, and material for each item.
3. THE Vision_Analyzer SHALL return Identified_Items in the same structured format as Wardrobe_Items (type, color, material fields).
4. IF the Vision_Analyzer cannot identify any clothing items in the uploaded photo, THEN THE Drape_App SHALL display a message indicating that no clothing items were detected and prompt the User to try a different photo.
5. IF the Vision_Analyzer encounters an API error during analysis, THEN THE Drape_App SHALL display an error message and provide a retry option.

### Requirement 3: Wardrobe Auto-Addition with Deduplication

**User Story:** As a user, I want newly identified clothing items to be automatically added to my wardrobe if they're not already there.

#### Acceptance Criteria

1. WHEN the Vision_Analyzer identifies clothing items from a photo, THE Drape_App SHALL perform a Deduplication_Check comparing each Identified_Item against the User's existing Wardrobe_Items.
2. WHEN a Deduplication_Check determines that an Identified_Item does not match any existing Wardrobe_Item (based on type, color, and material), THE Drape_App SHALL add the Identified_Item to the User's wardrobe as a new Wardrobe_Item.
3. WHEN a Deduplication_Check determines that an Identified_Item matches an existing Wardrobe_Item, THE Drape_App SHALL link the existing Wardrobe_Item to the Outfit_Photo without creating a duplicate.
4. THE Drape_App SHALL visually distinguish new items (added to wardrobe) from existing items (already in wardrobe) in the Identified_Items list.
5. WHEN new Wardrobe_Items are added via photo recognition, THE Drape_App SHALL display a count of newly added items to the User.

### Requirement 4: Item Correction Before Saving

**User Story:** As a user, I want to correct or remove incorrectly identified items before saving so the data in my wardrobe stays accurate.

#### Acceptance Criteria

1. WHEN the Vision_Analyzer displays Identified_Items, THE Drape_App SHALL allow the User to remove any incorrectly identified item from the list before saving.
2. WHEN the Vision_Analyzer displays Identified_Items, THE Drape_App SHALL allow the User to edit the type, color, or material of any Identified_Item before saving.
3. WHEN a User removes an Identified_Item from the list, THE Drape_App SHALL exclude that item from wardrobe addition and from the saved Outfit_Photo record.
4. WHEN a User edits an Identified_Item, THE Drape_App SHALL use the corrected values for the Deduplication_Check and wardrobe addition.

### Requirement 5: Occasion Context Tagging

**User Story:** As a user, I want to tag my photo with an occasion context so I can categorize my looks.

#### Acceptance Criteria

1. WHEN a User is preparing to save a photo entry, THE Drape_App SHALL display Occasion_Context options (Work, Casual, Night Out) for the User to select.
2. THE Drape_App SHALL require the User to select exactly one Occasion_Context before saving an Outfit_Photo.
3. WHEN a User selects an Occasion_Context, THE Drape_App SHALL associate the selected context with the Outfit_Photo record.

### Requirement 6: Personal Note

**User Story:** As a user, I want to add an optional personal note to my photo entry so I can remember the context.

#### Acceptance Criteria

1. WHEN a User is preparing to save a photo entry, THE Drape_App SHALL display a text input field for an optional Personal_Note.
2. THE Drape_App SHALL limit the Personal_Note to a maximum of 280 characters.
3. IF a User enters a Personal_Note exceeding 280 characters, THEN THE Drape_App SHALL prevent submission and display the remaining character count.
4. WHEN a User saves an Outfit_Photo with a Personal_Note, THE Drape_App SHALL store the note text with the Outfit_Photo record.

### Requirement 7: Save to Outfit Journey

**User Story:** As a user, I want my photo entries to appear in the Outfit Journey timeline so I can track my real style over time.

#### Acceptance Criteria

1. WHEN a User confirms saving an Outfit_Photo (with selected Occasion_Context and optional Personal_Note), THE Drape_App SHALL store the Outfit_Photo record containing: photo image URL, Identified_Item references, Occasion_Context, Personal_Note, and timestamp.
2. WHEN an Outfit_Photo is saved, THE Drape_App SHALL display the Outfit_Photo in the Outfit Journey timeline alongside existing Saved_Outfits, ordered chronologically.
3. THE Drape_App SHALL display each Outfit_Photo in the Outfit Journey with: the uploaded photo thumbnail, Occasion_Context badge, date, and Personal_Note excerpt.
4. WHEN a User taps an Outfit_Photo card in the Outfit Journey, THE Drape_App SHALL expand the card to show the full-size photo, all associated clothing items, and the complete Personal_Note.
5. WHEN a User applies an Occasion_Context filter on the Outfit Journey screen, THE Drape_App SHALL include Outfit_Photos matching the selected context in the filtered results.
6. WHEN an Outfit_Photo is successfully saved, THE Drape_App SHALL display a confirmation message and reset the Today's Look page to accept a new photo upload.

### Requirement 8: Navigation Restructure

**User Story:** As a user, I want clear navigation between documenting my outfit (Today's Look), getting AI styling suggestions (Styling), managing my wardrobe, and viewing my outfit history.

#### Acceptance Criteria

1. THE Navigation_Bar SHALL display four navigation items in the following order: Today's Look, Styling, My Wardrobe, Outfit Journey.
2. WHEN a User taps "Today's Look" in the Navigation_Bar, THE Drape_App SHALL navigate to the photo upload and clothing recognition page.
3. WHEN a User taps "Styling" in the Navigation_Bar, THE Drape_App SHALL navigate to the AI outfit generation page containing the context toggle, avatar card, accessory prompt input, accessory shelf, suggestion panel, and save button.
4. WHEN a User taps "My Wardrobe" in the Navigation_Bar, THE Drape_App SHALL navigate to the wardrobe catalogue page.
5. WHEN a User taps "Outfit Journey" in the Navigation_Bar, THE Drape_App SHALL navigate to the outfit timeline page.
6. THE Drape_App SHALL highlight the active navigation item corresponding to the current page.

### Requirement 9: Styling Page (Feature Relocation)

**User Story:** As a user, I want to access AI outfit generation and accessory features on a dedicated Styling page so I can get styling suggestions separately from documenting my actual outfits.

#### Acceptance Criteria

1. THE Styling_Page SHALL contain all features previously on the Today's Look page: Occasion_Context toggle, Avatar card with outfit generation, accessory prompt input, accessory shelf, suggestion panel, and save outfit button.
2. THE Styling_Page SHALL maintain identical functionality to the former Today's Look page for outfit generation, accessory compositing, and outfit saving.
3. WHEN a User navigates to the Styling_Page, THE Drape_App SHALL load the User's wardrobe data and accessory shelf as previously done on the Today's Look page.
4. THE Drape_App SHALL preserve all existing saved outfits generated from the former Today's Look page and display them in the Outfit Journey timeline.

### Requirement 10: Outfit Photo Data Model

**User Story:** As a developer, I want a data model for photo entries so the system can store and retrieve outfit photos with their associated metadata.

#### Acceptance Criteria

1. THE Drape_App SHALL store each Outfit_Photo with the following fields: unique identifier, User identifier, photo image URL, array of associated Wardrobe_Item identifiers, Occasion_Context, Personal_Note, and creation timestamp.
2. THE Drape_App SHALL store uploaded photo images in persistent storage and reference them by URL in the Outfit_Photo record.
3. WHEN an Outfit_Photo is retrieved, THE Drape_App SHALL return all associated Wardrobe_Item details alongside the photo metadata.
4. FOR ALL valid Outfit_Photo records, saving and then retrieving the record SHALL produce an Outfit_Photo with all fields matching the original values (round-trip property).
