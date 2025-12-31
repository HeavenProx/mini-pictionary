const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const prompts = [
    // Facile
    { text: 'Chat', difficulty: 'easy', category: 'animals' },
    { text: 'Chien', difficulty: 'easy', category: 'animals' },
    { text: 'Maison', difficulty: 'easy', category: 'objects' },
    { text: 'Soleil', difficulty: 'easy', category: 'nature' },
    { text: 'Lune', difficulty: 'easy', category: 'nature' },
    { text: 'Pomme', difficulty: 'easy', category: 'food' },
    { text: 'Voiture', difficulty: 'easy', category: 'transport' },
    { text: 'Livre', difficulty: 'easy', category: 'objects' },
    { text: 'Fleur', difficulty: 'easy', category: 'nature' },
    { text: 'Poisson', difficulty: 'easy', category: 'animals' },
    { text: 'Oiseau', difficulty: 'easy', category: 'animals' },
    { text: 'Arbre', difficulty: 'easy', category: 'nature' },
    { text: 'Ballon', difficulty: 'easy', category: 'objects' },
    { text: 'Crayon', difficulty: 'easy', category: 'objects' },
    { text: 'Téléphone', difficulty: 'easy', category: 'objects' },
    { text: 'Bateau', difficulty: 'easy', category: 'transport' },
    { text: 'Gâteau', difficulty: 'easy', category: 'food' },
    { text: 'Pizza', difficulty: 'easy', category: 'food' },
    { text: 'Chaise', difficulty: 'easy', category: 'objects' },
    { text: 'Table', difficulty: 'easy', category: 'objects' },

    // Moyen
    { text: 'Avion', difficulty: 'medium', category: 'transport' },
    { text: 'Montagne', difficulty: 'medium', category: 'nature' },
    { text: 'Bicycle', difficulty: 'medium', category: 'transport' },
    { text: 'Robot', difficulty: 'medium', category: 'technology' },
    { text: 'Licorne', difficulty: 'medium', category: 'fantasy' },
    { text: 'Plage', difficulty: 'medium', category: 'nature' },
    { text: 'Château', difficulty: 'medium', category: 'places' },
    { text: 'Fantôme', difficulty: 'medium', category: 'fantasy' },
    { text: 'Forêt', difficulty: 'medium', category: 'nature' },
    { text: 'Balançoire', difficulty: 'medium', category: 'objects' },
    { text: 'Coccinelle', difficulty: 'medium', category: 'animals' },
    { text: 'Radio', difficulty: 'medium', category: 'objects' },
    { text: 'Parapluie', difficulty: 'medium', category: 'objects' },
    { text: 'Montre', difficulty: 'medium', category: 'objects' },
    { text: 'Lampe', difficulty: 'medium', category: 'objects' },

    // Difficile
    { text: 'Caméléon', difficulty: 'hard', category: 'animals' },
    { text: 'Kangourou', difficulty: 'hard', category: 'animals' },
    { text: 'Astronaute', difficulty: 'hard', category: 'professions' },
    { text: 'Hélicoptère', difficulty: 'hard', category: 'transport' },
    { text: 'Xylophone', difficulty: 'hard', category: 'music' },
    { text: 'Sphinx', difficulty: 'hard', category: 'mythology' },
    { text: 'Boussole', difficulty: 'hard', category: 'objects' },
    { text: 'Parachute', difficulty: 'hard', category: 'objects' },
    { text: 'Micro-onde', difficulty: 'hard', category: 'objects' },
    { text: 'Harmonica', difficulty: 'hard', category: 'music' },

    // Misc / Fun
    { text: 'Arc-en-ciel', difficulty: 'medium', category: 'nature' },
    { text: 'Fromage', difficulty: 'easy', category: 'food' },
    { text: 'Licorne', difficulty: 'medium', category: 'fantasy' },
    { text: 'Guitare', difficulty: 'medium', category: 'music' },
    { text: 'Éléphant', difficulty: 'medium', category: 'animals' },
    { text: 'Ping-pong', difficulty: 'medium', category: 'sports' },
    { text: 'Camion-poubelle', difficulty: 'hard', category: 'vehicles' },
    { text: 'Zèbre', difficulty: 'medium', category: 'animals' },
    { text: 'Pingouin', difficulty: 'medium', category: 'animals' },
    { text: 'Statue de la Liberté', difficulty: 'hard', category: 'landmarks' },

    // Add more - large list
    { text: 'Montgolfière', difficulty: 'hard', category: 'transport' },
    { text: 'Igloo', difficulty: 'medium', category: 'places' },
    { text: 'Boussole', difficulty: 'hard', category: 'objects' },
    { text: 'Cactus', difficulty: 'easy', category: 'nature' },
    { text: 'Sushi', difficulty: 'medium', category: 'food' },
    { text: 'Tortue', difficulty: 'easy', category: 'animals' },
    { text: 'Scarabée', difficulty: 'hard', category: 'animals' },
    { text: 'Télévision', difficulty: 'easy', category: 'objects' },
    { text: 'Ordinateur', difficulty: 'medium', category: 'technology' },
    { text: 'Drone', difficulty: 'medium', category: 'technology' },
    { text: 'Échelle', difficulty: 'easy', category: 'objects' },
    { text: 'Feu de camp', difficulty: 'medium', category: 'nature' },
    { text: 'Pyramid', difficulty: 'hard', category: 'landmarks' },
    { text: 'Ciseaux', difficulty: 'easy', category: 'objects' },
    { text: 'Glace', difficulty: 'easy', category: 'food' },
    { text: 'Batterie', difficulty: 'medium', category: 'music' },
    { text: 'Élastique', difficulty: 'easy', category: 'objects' },
    { text: 'Fer à repasser', difficulty: 'medium', category: 'household' },
    { text: 'Lamantin', difficulty: 'hard', category: 'animals' },
    { text: 'Sablier', difficulty: 'hard', category: 'objects' }
  ]

  console.log('Seeding prompts...', prompts.length)
  await prisma.prompt.createMany({ data: prompts, skipDuplicates: true })
  console.log('Seeding done')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
