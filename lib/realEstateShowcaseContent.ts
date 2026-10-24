// Public community context only. Contract terms and member figures come from the ledger.
export function realEstateShowcaseContent(investment: {
  name: string;
  projectName?: string | null;
  unitIdentifier?: string | null;
}) {
  const name = `${investment.projectName ?? ''} ${investment.name}`.toLowerCase();
  if (name.includes('bora bora')) return {
    website: 'https://www.islands-dubai.com/damac-islands-bora-bora/',
    sourceLabel: 'Islands Living',
    description: 'Polynesian inspiration meets Dubai living, with turquoise lagoons, tropical landscaping and spaces designed around the water.',
    highlights: ['Lagoon living', 'Tropical landscapes', 'Resort amenities'],
    imageAlt: 'DAMAC Islands community rendering with turquoise lagoons, palm trees and waterside leisure spaces',
  };
  if (name.includes('maui')) return {
    website: 'https://www.islands-dubai.com/damac-islands-2-maui/',
    sourceLabel: 'Islands Living',
    description: 'An island-inspired setting in DAMAC Islands 2, where lush greenery, water and outdoor spaces bring a resort atmosphere to everyday life.',
    highlights: ['Island inspiration', 'Waterside spaces', 'Lush greenery'],
    imageAlt: 'DAMAC Islands 2 community rendering with a lagoon, landscaped islands and contemporary homes',
  };
  if (name.includes('hills 2') || investment.unitIdentifier?.startsWith('VOT3/')) return {
    website: 'https://www.damacproperties.com/en/communities/damac-hills-2/',
    sourceLabel: 'DAMAC Properties',
    description: 'A community built around the outdoors, with contemporary homes, green spaces and water, sports and leisure experiences for the whole family.',
    highlights: ['Green open spaces', 'Water attractions', 'Sports & leisure'],
    imageAlt: 'Aerial rendering of DAMAC Hills 2 with contemporary homes, lakes, green parks and sports fields',
  };
  return null;
}
