import OpenAI from 'openai';

// Entity type definitions matching the spec
export type EntityType = 
  | 'person' 
  | 'event' 
  | 'product' 
  | 'organization' 
  | 'location' 
  | 'media' 
  | 'animal' 
  | 'information' 
  | 'other';

// Field type definitions
export type FieldType = 
  | 'string' 
  | 'number' 
  | 'boolean' 
  | 'enum' 
  | 'date' 
  | 'url' 
  | 'image';

// Metadata field definition
export interface MetadataField {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
  description: string;
  example: any;
  enum_values?: string[];
}

// Metadata schema
export interface MetadataSchema {
  version: 'v1';
  fields: MetadataField[];
}

// Subtopic with metadata
export interface SubtopicWithMetadata {
  name: string;
  normalized_name: string;
  metadata: Record<string, any>;
}

// Full response structure
export interface SubtopicSuggestionResponse {
  inferred_type: EntityType;
  confidence: number;
  schema: MetadataSchema;
  subtopics: SubtopicWithMetadata[];
  rationales: {
    type_reason: string;
    field_reasons: Record<string, string>;
  };
}

// Input structure
export interface SubtopicGenerationInput {
  hub: {
    name: string;
    description?: string;
    tags?: string[];
  };
  topic: {
    name: string;
    description?: string;
  };
  context_examples?: string[];
  candidate_subtopics: string[];
  locale?: {
    region: string;
    language: string;
  };
}

// Predefined schema templates for each entity type
const SCHEMA_TEMPLATES: Record<EntityType, MetadataField[]> = {
  person: [
    {
      id: 'full_name',
      label: 'Full Name',
      type: 'string',
      required: true,
      description: 'Complete full name',
      example: 'Conor Anthony McGregor'
    },
    {
      id: 'nationality',
      label: 'Nationality',
      type: 'string',
      required: false,
      description: 'Country of origin/citizenship',
      example: 'Irish'
    },
    {
      id: 'birth_year',
      label: 'Birth Year',
      type: 'number',
      required: false,
      description: 'Year of birth',
      example: 1988
    },
    {
      id: 'profession',
      label: 'Primary Profession',
      type: 'string',
      required: false,
      description: 'Main occupation or field',
      example: 'Professional Fighter'
    },
    {
      id: 'height_cm',
      label: 'Height (cm)',
      type: 'number',
      required: false,
      description: 'Height in centimeters',
      example: 175
    },
    {
      id: 'weight_kg',
      label: 'Weight (kg)',
      type: 'number',
      required: false,
      description: 'Weight in kilograms',
      example: 77
    }
  ],
  event: [
    {
      id: 'start_date',
      label: 'Start Date',
      type: 'date',
      required: false,
      description: 'Event start date',
      example: '2024-07-15'
    },
    {
      id: 'end_date',
      label: 'End Date',
      type: 'date',
      required: false,
      description: 'Event end date',
      example: '2024-07-30'
    },
    {
      id: 'location',
      label: 'Location',
      type: 'string',
      required: false,
      description: 'Event location',
      example: 'Paris, France'
    },
    {
      id: 'organizer',
      label: 'Organizer',
      type: 'string',
      required: false,
      description: 'Organization or person organizing the event',
      example: 'International Olympic Committee'
    },
    {
      id: 'category',
      label: 'Category',
      type: 'enum',
      required: false,
      description: 'Type of event',
      example: 'sports',
      enum_values: ['sports', 'music', 'conference', 'festival', 'competition', 'ceremony', 'other']
    },
    {
      id: 'status',
      label: 'Status',
      type: 'enum',
      required: false,
      description: 'Current event status',
      example: 'upcoming',
      enum_values: ['upcoming', 'ongoing', 'completed', 'cancelled', 'postponed']
    }
  ],
  product: [
    {
      id: 'brand',
      label: 'Brand',
      type: 'string',
      required: false,
      description: 'Product brand or manufacturer',
      example: 'Apple'
    },
    {
      id: 'model',
      label: 'Model',
      type: 'string',
      required: false,
      description: 'Product model or version',
      example: 'iPhone 15 Pro'
    },
    {
      id: 'category',
      label: 'Category',
      type: 'enum',
      required: false,
      description: 'Product category',
      example: 'electronics',
      enum_values: ['electronics', 'clothing', 'automotive', 'home', 'health', 'sports', 'books', 'other']
    },
    {
      id: 'price_currency',
      label: 'Currency',
      type: 'string',
      required: false,
      description: 'Price currency code',
      example: 'USD'
    },
    {
      id: 'price_value',
      label: 'Price',
      type: 'number',
      required: false,
      description: 'Product price',
      example: 999
    },
    {
      id: 'release_date',
      label: 'Release Date',
      type: 'date',
      required: false,
      description: 'Product release date',
      example: '2023-09-22'
    }
  ],
  organization: [
    {
      id: 'founded_year',
      label: 'Founded Year',
      type: 'number',
      required: false,
      description: 'Year the organization was founded',
      example: 1976
    },
    {
      id: 'hq_location',
      label: 'Headquarters',
      type: 'string',
      required: false,
      description: 'Location of headquarters',
      example: 'Cupertino, California'
    },
    {
      id: 'industry',
      label: 'Industry',
      type: 'enum',
      required: false,
      description: 'Primary industry sector',
      example: 'technology',
      enum_values: ['technology', 'finance', 'healthcare', 'retail', 'manufacturing', 'education', 'nonprofit', 'government', 'other']
    },
    {
      id: 'website',
      label: 'Website',
      type: 'url',
      required: false,
      description: 'Official website URL',
      example: 'https://www.apple.com'
    },
    {
      id: 'size_range',
      label: 'Company Size',
      type: 'enum',
      required: false,
      description: 'Number of employees range',
      example: 'large',
      enum_values: ['startup', 'small', 'medium', 'large', 'enterprise']
    }
  ],
  location: [
    {
      id: 'country',
      label: 'Country',
      type: 'string',
      required: false,
      description: 'Country name',
      example: 'France'
    },
    {
      id: 'city',
      label: 'City',
      type: 'string',
      required: false,
      description: 'City name',
      example: 'Paris'
    },
    {
      id: 'latitude',
      label: 'Latitude',
      type: 'number',
      required: false,
      description: 'Latitude coordinate',
      example: 48.8566
    },
    {
      id: 'longitude',
      label: 'Longitude',
      type: 'number',
      required: false,
      description: 'Longitude coordinate',
      example: 2.3522
    },
    {
      id: 'type',
      label: 'Location Type',
      type: 'enum',
      required: false,
      description: 'Type of location',
      example: 'city',
      enum_values: ['city', 'country', 'region', 'landmark', 'venue', 'natural', 'other']
    },
    {
      id: 'population',
      label: 'Population',
      type: 'number',
      required: false,
      description: 'Population count',
      example: 2161000
    }
  ],
  media: [
    {
      id: 'title',
      label: 'Title',
      type: 'string',
      required: true,
      description: 'Media title',
      example: 'The Shawshank Redemption'
    },
    {
      id: 'media_type',
      label: 'Media Type',
      type: 'enum',
      required: false,
      description: 'Type of media',
      example: 'movie',
      enum_values: ['movie', 'tv_show', 'book', 'music', 'podcast', 'video_game', 'documentary', 'other']
    },
    {
      id: 'release_year',
      label: 'Release Year',
      type: 'number',
      required: false,
      description: 'Year of release',
      example: 1994
    },
    {
      id: 'creator',
      label: 'Creator/Director',
      type: 'string',
      required: false,
      description: 'Main creator, director, or author',
      example: 'Frank Darabont'
    },
    {
      id: 'genre',
      label: 'Genre',
      type: 'string',
      required: false,
      description: 'Primary genre',
      example: 'Drama'
    },
    {
      id: 'rating',
      label: 'Rating',
      type: 'number',
      required: false,
      description: 'Rating score (0-10)',
      example: 9.3
    }
  ],
  animal: [
    {
      id: 'species',
      label: 'Species',
      type: 'string',
      required: false,
      description: 'Scientific or common species name',
      example: 'Panthera leo'
    },
    {
      id: 'common_name',
      label: 'Common Name',
      type: 'string',
      required: true,
      description: 'Common name for the animal',
      example: 'Lion'
    },
    {
      id: 'habitat',
      label: 'Natural Habitat',
      type: 'string',
      required: false,
      description: 'Primary natural habitat',
      example: 'African savanna'
    },
    {
      id: 'conservation_status',
      label: 'Conservation Status',
      type: 'enum',
      required: false,
      description: 'IUCN conservation status',
      example: 'vulnerable',
      enum_values: ['least_concern', 'near_threatened', 'vulnerable', 'endangered', 'critically_endangered', 'extinct']
    },
    {
      id: 'diet_type',
      label: 'Diet Type',
      type: 'enum',
      required: false,
      description: 'Primary diet classification',
      example: 'carnivore',
      enum_values: ['herbivore', 'carnivore', 'omnivore', 'insectivore', 'other']
    }
  ],
  information: [
    {
      id: 'category',
      label: 'Category',
      type: 'string',
      required: false,
      description: 'Information category or field',
      example: 'Computer Science'
    },
    {
      id: 'complexity',
      label: 'Complexity Level',
      type: 'enum',
      required: false,
      description: 'Difficulty or complexity level',
      example: 'intermediate',
      enum_values: ['beginner', 'intermediate', 'advanced', 'expert']
    },
    {
      id: 'source_type',
      label: 'Source Type',
      type: 'enum',
      required: false,
      description: 'Type of information source',
      example: 'academic',
      enum_values: ['academic', 'tutorial', 'reference', 'news', 'opinion', 'documentation', 'other']
    },
    {
      id: 'last_updated',
      label: 'Last Updated',
      type: 'date',
      required: false,
      description: 'When the information was last updated',
      example: '2024-01-15'
    }
  ],
  other: [
    {
      id: 'category',
      label: 'Category',
      type: 'string',
      required: false,
      description: 'General category',
      example: 'Miscellaneous'
    },
    {
      id: 'description',
      label: 'Description',
      type: 'string',
      required: false,
      description: 'Brief description',
      example: 'General purpose item'
    }
  ]
};

export class SubtopicMetadataGenerator {
  private openai: OpenAI | null = null;

  constructor() {
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }
  }

  /**
   * Infer entity type from hub, topic, and context information
   */
  private async inferEntityType(input: SubtopicGenerationInput): Promise<{ type: EntityType; confidence: number; reason: string }> {
    if (!this.openai) {
      // Fallback logic without OpenAI
      return this.fallbackTypeInference(input);
    }

    const prompt = `Analyze the following content and determine the most appropriate entity type. 

Hub: "${input.hub.name}"
${input.hub.description ? `Hub Description: "${input.hub.description}"` : ''}
Topic: "${input.topic.name}"
${input.topic.description ? `Topic Description: "${input.topic.description}"` : ''}
${input.context_examples ? `Examples: ${input.context_examples.join(', ')}` : ''}
Candidate Subtopics: ${input.candidate_subtopics.join(', ')}

Entity types to choose from:
- person: Individual people (athletes, celebrities, professionals, historical figures)
- event: Occurrences, competitions, festivals, conferences, ceremonies  
- product: Consumer goods, software, vehicles, manufactured items
- organization: Companies, institutions, government bodies, nonprofits
- location: Cities, countries, venues, landmarks, natural places
- media: Movies, books, music, games, TV shows, podcasts
- animal: Species, breeds, individual animals
- information: Concepts, topics, techniques, methodologies, subjects
- other: Items that don't fit the above categories

Return only a JSON object with this structure:
{
  "type": "person|event|product|organization|location|media|animal|information|other",
  "confidence": 0.8,
  "reason": "Brief explanation why this type fits best"
}`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        response_format: { type: 'json_object' }
      });

      const result = JSON.parse(response.choices[0]?.message?.content || '{}');
      
      return {
        type: result.type || 'other',
        confidence: Math.min(Math.max(result.confidence || 0.5, 0), 1),
        reason: result.reason || 'Automated inference'
      };
    } catch (error) {
      console.error('Error inferring entity type:', error);
      return this.fallbackTypeInference(input);
    }
  }

  /**
   * Fallback type inference without OpenAI
   */
  private fallbackTypeInference(input: SubtopicGenerationInput): { type: EntityType; confidence: number; reason: string } {
    const text = `${input.hub.name} ${input.hub.description || ''} ${input.topic.name} ${input.topic.description || ''} ${input.candidate_subtopics.join(' ')}`.toLowerCase();

    // Simple keyword-based inference
    const patterns = [
      { type: 'person' as EntityType, keywords: ['player', 'athlete', 'person', 'people', 'fighter', 'celebrity', 'actor', 'musician', 'artist'], confidence: 0.7 },
      { type: 'event' as EntityType, keywords: ['event', 'competition', 'championship', 'tournament', 'festival', 'conference', 'olympics', 'match', 'race'], confidence: 0.7 },
      { type: 'product' as EntityType, keywords: ['product', 'device', 'phone', 'car', 'software', 'app', 'tool', 'equipment', 'brand'], confidence: 0.7 },
      { type: 'organization' as EntityType, keywords: ['company', 'organization', 'team', 'club', 'agency', 'institution', 'corporation', 'business'], confidence: 0.7 },
      { type: 'location' as EntityType, keywords: ['city', 'country', 'place', 'location', 'stadium', 'venue', 'restaurant', 'hotel', 'park', 'building'], confidence: 0.7 },
      { type: 'media' as EntityType, keywords: ['movie', 'film', 'book', 'song', 'album', 'show', 'series', 'game', 'video', 'podcast'], confidence: 0.7 },
      { type: 'animal' as EntityType, keywords: ['animal', 'species', 'dog', 'cat', 'bird', 'fish', 'wildlife', 'pet', 'breed'], confidence: 0.7 }
    ];

    for (const pattern of patterns) {
      if (pattern.keywords.some(keyword => text.includes(keyword))) {
        return {
          type: pattern.type,
          confidence: pattern.confidence,
          reason: `Detected keywords suggesting ${pattern.type} type`
        };
      }
    }

    return {
      type: 'other',
      confidence: 0.3,
      reason: 'Could not determine specific type from context'
    };
  }

  /**
   * Generate metadata schema based on entity type and context
   */
  private generateSchema(entityType: EntityType, input: SubtopicGenerationInput): { schema: MetadataSchema; fieldReasons: Record<string, string> } {
    const baseFields = [...SCHEMA_TEMPLATES[entityType]];
    const fieldReasons: Record<string, string> = {};

    // Add reasoning for each field
    baseFields.forEach(field => {
      switch (entityType) {
        case 'person':
          fieldReasons[field.id] = field.id === 'full_name' ? 'Essential for person identification' :
                                   field.id === 'nationality' ? 'Important for context and background' :
                                   field.id === 'profession' ? 'Defines their role and expertise' :
                                   'Commonly referenced attribute for people';
          break;
        case 'event':
          fieldReasons[field.id] = field.id === 'start_date' ? 'Critical for event planning and attendance' :
                                  field.id === 'location' ? 'Essential for event logistics' :
                                  'Standard event metadata for organization';
          break;
        case 'product':
          fieldReasons[field.id] = field.id === 'brand' ? 'Key for product identification' :
                                  field.id === 'price_value' ? 'Critical for purchasing decisions' :
                                  'Standard product specification';
          break;
        case 'organization':
          fieldReasons[field.id] = field.id === 'industry' ? 'Defines business sector and context' :
                                  field.id === 'website' ? 'Primary contact point' :
                                  'Standard organizational information';
          break;
        case 'location':
          fieldReasons[field.id] = field.id === 'country' ? 'Essential geographical context' :
                                  field.id === 'latitude' ? 'Precise location data' :
                                  'Standard geographical metadata';
          break;
        case 'media':
          fieldReasons[field.id] = field.id === 'title' ? 'Primary identifier for media content' :
                                  field.id === 'media_type' ? 'Categorizes content format' :
                                  'Standard media metadata';
          break;
        case 'animal':
          fieldReasons[field.id] = field.id === 'species' ? 'Scientific classification' :
                                  field.id === 'conservation_status' ? 'Environmental impact awareness' :
                                  'Standard biological information';
          break;
        case 'information':
          fieldReasons[field.id] = field.id === 'category' ? 'Organizes information by topic' :
                                  field.id === 'complexity' ? 'Helps users find appropriate content' :
                                  'Standard information metadata';
          break;
        default:
          fieldReasons[field.id] = 'General purpose metadata field';
      }
    });

    return {
      schema: {
        version: 'v1',
        fields: baseFields
      },
      fieldReasons
    };
  }

  /**
   * Normalize a name to snake_case format
   */
  private normalizeName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^\w\s-]/g, '') // Remove special characters except spaces and hyphens
      .replace(/\s+/g, '_')     // Replace spaces with underscores
      .replace(/-+/g, '_')      // Replace hyphens with underscores
      .replace(/_+/g, '_')      // Collapse multiple underscores
      .replace(/^_+|_+$/g, ''); // Remove leading/trailing underscores
  }

  /**
   * Generate metadata for subtopics using AI
   */
  private async generateMetadata(
    subtopicNames: string[],
    schema: MetadataSchema,
    entityType: EntityType,
    input: SubtopicGenerationInput
  ): Promise<SubtopicWithMetadata[]> {
    if (!this.openai) {
      return this.fallbackMetadataGeneration(subtopicNames, schema);
    }

    const schemaDescription = schema.fields.map(field => 
      `- ${field.id} (${field.type}): ${field.description}${field.enum_values ? ` Options: ${field.enum_values.join(', ')}` : ''}`
    ).join('\n');

    const locale = input.locale || { region: 'US', language: 'en' };
    const useMetricUnits = locale.region !== 'US';

    const prompt = `Generate metadata for these ${entityType} subtopics based on the schema provided. Return ONLY valid JSON.

Context:
Hub: "${input.hub.name}"
Topic: "${input.topic.name}"
Entity Type: ${entityType}
Locale: ${locale.region} (${locale.language})
Units: ${useMetricUnits ? 'Metric (cm, kg, €)' : 'Imperial where applicable'}

Schema fields:
${schemaDescription}

Subtopics: ${subtopicNames.join(', ')}

For each subtopic, provide factual metadata values. Only include fields where you have factual information - omit unknown values. Use metric units unless locale strongly implies otherwise.

Return JSON format:
{
  "subtopics": [
    {
      "name": "subtopic name",
      "normalized_name": "snake_case_name",
      "metadata": {
        "field_id": "value",
        ...
      }
    },
    ...
  ]
}`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        response_format: { type: 'json_object' }
      });

      const result = JSON.parse(response.choices[0]?.message?.content || '{}');
      
      if (result.subtopics && Array.isArray(result.subtopics)) {
        return result.subtopics.map((subtopic: any) => ({
          name: subtopic.name || '',
          normalized_name: subtopic.normalized_name || this.normalizeName(subtopic.name || ''),
          metadata: subtopic.metadata || {}
        }));
      }
      
      return this.fallbackMetadataGeneration(subtopicNames, schema);
    } catch (error) {
      console.error('Error generating metadata:', error);
      return this.fallbackMetadataGeneration(subtopicNames, schema);
    }
  }

  /**
   * Fallback metadata generation without AI
   */
  private fallbackMetadataGeneration(subtopicNames: string[], schema: MetadataSchema): SubtopicWithMetadata[] {
    return subtopicNames.map(name => ({
      name,
      normalized_name: this.normalizeName(name),
      metadata: {} // Empty metadata when AI is not available
    }));
  }

  /**
   * Main method to generate subtopic suggestions with metadata
   */
  async generateSubtopicsWithMetadata(input: SubtopicGenerationInput): Promise<SubtopicSuggestionResponse> {
    // Step 1: Infer entity type
    const typeInference = await this.inferEntityType(input);

    // Step 2: Generate schema
    const { schema, fieldReasons } = this.generateSchema(typeInference.type, input);

    // Step 3: Generate metadata for subtopics
    const subtopics = await this.generateMetadata(
      input.candidate_subtopics,
      schema,
      typeInference.type,
      input
    );

    return {
      inferred_type: typeInference.type,
      confidence: typeInference.confidence,
      schema,
      subtopics,
      rationales: {
        type_reason: typeInference.reason,
        field_reasons: fieldReasons
      }
    };
  }
}

// Export singleton instance
export const subtopicMetadataGenerator = new SubtopicMetadataGenerator();