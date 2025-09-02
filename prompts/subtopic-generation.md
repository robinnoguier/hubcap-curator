# Subtopic Generator — GPT-5 Optimized

Model: GPT-5 Thinking (o1-preview) or GPT-4-Turbo.  
If you are not using an advanced reasoning model, switch to one for best results.

## CRITICAL INSTRUCTION
**ACCURACY IS MANDATORY**: Only include items you are 100% certain are factually correct. No hallucinations, no guessing, no filling gaps with made-up information. If you're not completely sure about something, leave it out. It's better to return 5 correct items than 10 items with errors.

## Purpose
Generate high-quality subtopic suggestions for Hubcap with strict JSON output.

## Context
- Hub: {{hubName}} - {{hubDescription}}
- Topic: {{topicName}} - {{topicDescription}}
- User's Subtopic Description: {{subtopicDescription}}

## Configuration
- count: {{count}}
- maxSubtopics: {{maxSubtopics}}
- excludeSubtopics: {{excludeSubtopics}}

## Output Requirements
Return ONLY a valid JSON object with a "suggestions" array (no code fences, no explanatory text, no markdown):
{
  "suggestions": [
    { "name": "Specific subtopic name", "description": "1-2 sentences, concrete and factual." }
  ]
}

## Strict Rules

1. **Follow user description exactly** - No scope creep, no additions beyond what's requested
2. **Exhaustive requests** - If user says "all", "every", or "comprehensive", aim for completeness up to {{maxSubtopics}}
3. **Count precision** - Otherwise return exactly {{count}} items
4. **Real and specific** - Items must exist in the real world, be specific, non-overlapping
5. **Hierarchy respect** - All items must logically belong under "{{topicName}}"
6. **Apply exclusions** - Remove anything in {{excludeSubtopics}} (case-insensitive match)
7. **Language matching** - Use the same language as {{topicName}}
8. **Sorting logic**:
   - Exhaustive lists → alphabetical by name
   - Other requests → relevance to description
9. **Validation checklist** - Each item must:
   - Match ALL constraints in subtopicDescription
   - Be a real, verifiable entity
   - Fit logically under the topic
   - Not be vague or duplicate
10. **CRITICAL: ZERO HALLUCINATIONS POLICY**
    - ONLY include items you are 100% certain are factually correct
    - Every claim must be verifiable - no speculation or assumptions
    - For ANY achievement/accomplishment: Must have ACTUALLY happened, not "almost" or "could have"
    - For people: Must be real individuals with verified accomplishments
    - For places: Must exist or have existed
    - For events: Must have actually occurred
    - For products/services: Must be real and available
    - NEVER invent details to fill gaps
    - If you're not 100% certain about something, EXCLUDE IT
    - Better to return fewer correct items than include false ones

## Pattern-Specific Instructions

### Exhaustive Lists (e.g., "all stadiums above 60k in Europe")
- Generate actual, specific items: "Camp Nou", "Wembley Stadium", "Signal Iduna Park"
- Include ALL items meeting the criteria up to {{maxSubtopics}}
- Sort alphabetically by name
- Each description should include key facts (location, capacity, etc.)

### Achievement-Based Lists (e.g., "champions", "award winners", "record holders")
- ONLY include verified, official achievements
- Must have ACTUALLY achieved the stated accomplishment
- Include specific details that prove the achievement (e.g., years, categories, official titles)
- DO NOT include near-misses, nominations without wins, or unofficial claims
- Verify each claim against known facts
- For "all X who achieved Y" requests: Be exhaustive but ACCURATE
- If the specific criteria aren't met exactly, don't include it

### Categorical Requests (e.g., "types of training methods")
- Generate distinct, non-overlapping categories
- Each category should have clear boundaries
- Include 5-10 well-defined categories
- Descriptions should clarify what distinguishes each category

### Methods/Activities (e.g., "ways to improve sleep")
- Generate practical, actionable items
- Include diverse approaches (traditional and innovative)
- Each should be implementable
- Descriptions should briefly explain the method

## Quality Examples

### GOOD (for "all UFC champions in two divisions"):
{
  "suggestions": [
    { "name": "Amanda Nunes", "description": "Bantamweight and Featherweight champion. First woman to hold titles in two divisions simultaneously." },
    { "name": "Conor McGregor", "description": "Featherweight and Lightweight champion. First to hold titles in two divisions simultaneously." },
    { "name": "Daniel Cormier", "description": "Light Heavyweight and Heavyweight champion. Defended both titles successfully." },
    { "name": "Henry Cejudo", "description": "Flyweight and Bantamweight champion. Olympic gold medalist who conquered two divisions." },
    { "name": "Jon Jones", "description": "Light Heavyweight and Heavyweight champion. Dominated LHW before moving up to win HW title." },
    { "name": "Randy Couture", "description": "Heavyweight and Light Heavyweight champion. Hall of Famer who won titles in both divisions." }
  ]
}

### GOOD (for "all football stadiums above 60k in Europe"):
{
  "suggestions": [
  { "name": "Camp Nou", "description": "Barcelona, Spain. Capacity 99,354. Home of FC Barcelona, largest stadium in Europe." },
  { "name": "Croke Park", "description": "Dublin, Ireland. Capacity 82,300. GAA headquarters, also hosts rugby and football." },
  { "name": "Luzhniki Stadium", "description": "Moscow, Russia. Capacity 81,000. Hosted 2018 FIFA World Cup final." },
  { "name": "Olympiastadion Berlin", "description": "Berlin, Germany. Capacity 74,475. Historic venue, hosted 2006 World Cup final." },
  { "name": "San Siro", "description": "Milan, Italy. Capacity 75,923. Shared by AC Milan and Inter Milan." },
  { "name": "Signal Iduna Park", "description": "Dortmund, Germany. Capacity 81,365. Famous for the Yellow Wall stand." },
  { "name": "Stade de France", "description": "Paris, France. Capacity 80,698. National stadium, hosts football and rugby." },
  { "name": "Twickenham Stadium", "description": "London, England. Capacity 82,000. World's largest dedicated rugby stadium." },
    { "name": "Wembley Stadium", "description": "London, England. Capacity 90,000. England's national stadium, iconic arch design." }
  ]
}

### BAD (too vague/generic):
{
  "suggestions": [
  { "name": "Large European Stadiums", "description": "Overview of stadiums." },
    { "name": "Stadium Features", "description": "Various features found in stadiums." }
  ]
}

## Exclusions
{{#if excludeSubtopics}}
Do NOT include these already existing subtopics:
{{excludeSubtopics}}
{{/if}}

## Internal Processing Steps (DO NOT OUTPUT)
1. Parse subtopicDescription for specific constraints
2. Determine if exhaustive or limited request
3. Generate candidate list (2x the needed amount)
4. Apply all filters and exclusions
5. Validate each item against criteria
6. Sort according to rules
7. Trim to correct count
8. Format as clean JSON object with suggestions array
9. Final validation of JSON syntax

Remember: Output ONLY the JSON object with "suggestions" array. No explanations, no markdown, no extra text.