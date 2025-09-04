# Subtopic + Auto-Metadata Suggestion System Examples

## API Usage

### Endpoint: `/api/subtopics/generate-with-metadata`

**Complete workflow from user description to subtopics with metadata schema.**

#### Example 1: Fighter (Person Type)

**Request:**
```json
{
  "hubName": "Combat Sports",
  "hubDescription": "Professional fighting and martial arts",
  "topicName": "UFC Fighters", 
  "topicDescription": "Mixed martial arts fighters in the Ultimate Fighting Championship",
  "subtopicDescription": "top lightweight division fighters",
  "locale": { "region": "US", "language": "en" }
}
```

**Response:**
```json
{
  "inferred_type": "person",
  "confidence": 0.9,
  "schema": {
    "version": "v1",
    "fields": [
      {
        "id": "full_name",
        "label": "Full Name",
        "type": "string",
        "required": true,
        "description": "Complete full name",
        "example": "Conor Anthony McGregor"
      },
      {
        "id": "weight_kg",
        "label": "Weight (kg)",
        "type": "number",
        "required": false,
        "description": "Weight in kilograms",
        "example": 77
      },
      {
        "id": "height_cm",
        "label": "Height (cm)",
        "type": "number",
        "required": false,
        "description": "Height in centimeters",
        "example": 175
      },
      {
        "id": "nationality",
        "label": "Nationality",
        "type": "string",
        "required": false,
        "description": "Country of origin/citizenship",
        "example": "Irish"
      },
      {
        "id": "nickname",
        "label": "Fighting Nickname",
        "type": "string",
        "required": false,
        "description": "Professional fighting nickname",
        "example": "The Notorious"
      }
    ]
  },
  "subtopics": [
    {
      "name": "Conor McGregor",
      "description": "Former two-division UFC champion known for his striking and charisma",
      "normalized_name": "conor_mcgregor",
      "metadata": {
        "full_name": "Conor Anthony McGregor",
        "weight_kg": 77,
        "height_cm": 175,
        "nationality": "Irish",
        "nickname": "The Notorious"
      }
    },
    {
      "name": "Islam Makhachev",
      "description": "Current UFC Lightweight Champion with dominant grappling skills",
      "normalized_name": "islam_makhachev",
      "metadata": {
        "full_name": "Islam Ramazanovich Makhachev",
        "weight_kg": 70,
        "height_cm": 178,
        "nationality": "Russian"
      }
    }
  ],
  "rationales": {
    "type_reason": "Detected keywords 'fighters' and context suggests individual people in combat sports",
    "field_reasons": {
      "full_name": "Essential for person identification",
      "weight_kg": "Critical for weight class determination in combat sports",
      "height_cm": "Important physical attribute for fighting analysis",
      "nationality": "Important for context and background",
      "nickname": "Common in professional fighting for identity"
    }
  }
}
```

#### Example 2: Stadium (Location Type)

**Request:**
```json
{
  "hubName": "Football",
  "hubDescription": "Soccer stadiums and venues",
  "topicName": "European Stadiums",
  "topicDescription": "Major football stadiums in Europe",
  "subtopicDescription": "all stadiums in Europe above 65k capacity",
  "locale": { "region": "DE", "language": "en" }
}
```

**Response:**
```json
{
  "inferred_type": "location",
  "confidence": 0.95,
  "schema": {
    "version": "v1",
    "fields": [
      {
        "id": "capacity",
        "label": "Seating Capacity",
        "type": "number",
        "required": false,
        "description": "Maximum seating capacity",
        "example": 81365
      },
      {
        "id": "city",
        "label": "City",
        "type": "string",
        "required": false,
        "description": "City where stadium is located",
        "example": "Barcelona"
      },
      {
        "id": "country",
        "label": "Country",
        "type": "string",
        "required": false,
        "description": "Country location",
        "example": "Spain"
      },
      {
        "id": "opened_year",
        "label": "Opening Year",
        "type": "number",
        "required": false,
        "description": "Year the stadium opened",
        "example": 1957
      },
      {
        "id": "home_team",
        "label": "Home Team",
        "type": "string",
        "required": false,
        "description": "Primary team that plays at this stadium",
        "example": "FC Barcelona"
      }
    ]
  },
  "subtopics": [
    {
      "name": "Camp Nou",
      "description": "Iconic stadium in Barcelona, home to FC Barcelona",
      "normalized_name": "camp_nou",
      "metadata": {
        "capacity": 99354,
        "city": "Barcelona",
        "country": "Spain",
        "opened_year": 1957,
        "home_team": "FC Barcelona"
      }
    },
    {
      "name": "Wembley Stadium",
      "description": "England's national stadium in London",
      "normalized_name": "wembley_stadium",
      "metadata": {
        "capacity": 90000,
        "city": "London",
        "country": "England",
        "opened_year": 2007,
        "home_team": "England National Team"
      }
    }
  ],
  "rationales": {
    "type_reason": "Context clearly indicates physical venues/stadiums which are location-based entities",
    "field_reasons": {
      "capacity": "Essential for stadium comparison and categorization",
      "city": "Geographical identification",
      "country": "Essential geographical context",
      "opened_year": "Historical context for stadium development",
      "home_team": "Functional purpose and identity"
    }
  }
}
```

#### Example 3: Product Type

**Request:**
```json
{
  "hubName": "Technology",
  "hubDescription": "Consumer electronics and gadgets", 
  "topicName": "Smartphones",
  "topicDescription": "Mobile phones and devices",
  "subtopicDescription": "flagship smartphones released in 2024",
  "locale": { "region": "US", "language": "en" }
}
```

**Response:**
```json
{
  "inferred_type": "product",
  "confidence": 0.92,
  "schema": {
    "version": "v1",
    "fields": [
      {
        "id": "brand",
        "label": "Brand",
        "type": "string",
        "required": false,
        "description": "Product brand or manufacturer",
        "example": "Apple"
      },
      {
        "id": "model",
        "label": "Model",
        "type": "string", 
        "required": false,
        "description": "Product model or version",
        "example": "iPhone 15 Pro"
      },
      {
        "id": "price_value",
        "label": "Price (USD)",
        "type": "number",
        "required": false,
        "description": "Product price in USD",
        "example": 999
      },
      {
        "id": "release_date",
        "label": "Release Date",
        "type": "date",
        "required": false,
        "description": "Product release date",
        "example": "2024-09-20"
      },
      {
        "id": "screen_size",
        "label": "Screen Size (inches)",
        "type": "number",
        "required": false,
        "description": "Display screen size in inches",
        "example": 6.1
      }
    ]
  },
  "subtopics": [
    {
      "name": "iPhone 15 Pro",
      "description": "Apple's 2024 flagship with titanium design and A17 Pro chip",
      "normalized_name": "iphone_15_pro",
      "metadata": {
        "brand": "Apple",
        "model": "iPhone 15 Pro", 
        "price_value": 999,
        "release_date": "2024-09-20",
        "screen_size": 6.1
      }
    },
    {
      "name": "Samsung Galaxy S24 Ultra",
      "description": "Samsung's premium 2024 flagship with S Pen and AI features",
      "normalized_name": "samsung_galaxy_s24_ultra",
      "metadata": {
        "brand": "Samsung",
        "model": "Galaxy S24 Ultra",
        "price_value": 1299,
        "release_date": "2024-01-24",
        "screen_size": 6.8
      }
    }
  ],
  "rationales": {
    "type_reason": "Clear product context with smartphones being manufactured consumer goods",
    "field_reasons": {
      "brand": "Key for product identification and comparison",
      "model": "Specific product variant identification",
      "price_value": "Critical for purchasing decisions",
      "release_date": "Important for currency and availability",
      "screen_size": "Key specification for smartphones"
    }
  }
}
```

## UI Integration Flow

1. **User Input**: User describes subtopics (e.g., "all stadiums in Europe above 65k capacity")

2. **API Call**: Frontend calls `/api/subtopics/generate-with-metadata` 

3. **Type Detection**: System automatically detects this is about locations

4. **Schema Generation**: Generates appropriate metadata fields (capacity, city, country, etc.)

5. **Subtopic Generation**: Creates specific subtopics (Camp Nou, Wembley, etc.)

6. **Metadata Population**: Fills metadata with factual information

7. **UI Display**: Shows subtopics with editable metadata in modal:
   - Inferred type indicator
   - Toggle switches for each metadata field
   - Editable values for each subtopic
   - Preview of how schema will be applied

8. **User Confirmation**: User can:
   - Accept/reject inferred type
   - Enable/disable specific metadata fields  
   - Edit individual subtopic metadata
   - Confirm to save subtopics with chosen metadata

## Error Handling

- Graceful fallback when OpenAI unavailable
- Type confidence scoring to indicate uncertainty
- Empty metadata when AI can't determine values
- Validation of all metadata field types
- Support for partial metadata (missing fields are omitted)

## Performance Considerations

- Batch processing of multiple subtopics
- Caching of schema templates
- Async metadata population
- Fallback to basic subtopic generation if metadata fails