const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const prompts = [
  // Facile
  { text: 'Chat', difficulty: 'easy', category: 'animaux' },
  { text: 'Chien', difficulty: 'easy', category: 'animaux' },
  { text: 'Maison', difficulty: 'easy', category: 'objets' },
  { text: 'Soleil', difficulty: 'easy', category: 'nature' },
  { text: 'Lune', difficulty: 'easy', category: 'nature' },
  { text: 'Pomme', difficulty: 'easy', category: 'aliments' },
  { text: 'Voiture', difficulty: 'easy', category: 'transport' },
  { text: 'Livre', difficulty: 'easy', category: 'objets' },
  { text: 'Fleur', difficulty: 'easy', category: 'nature' },
  { text: 'Poisson', difficulty: 'easy', category: 'animaux' },
  { text: 'Oiseau', difficulty: 'easy', category: 'animaux' },
  { text: 'Arbre', difficulty: 'easy', category: 'nature' },
  { text: 'Ballon', difficulty: 'easy', category: 'objets' },
  { text: 'Crayon', difficulty: 'easy', category: 'objets' },
  { text: 'Téléphone', difficulty: 'easy', category: 'objets' },
  { text: 'Bateau', difficulty: 'easy', category: 'transport' },
  { text: 'Gâteau', difficulty: 'easy', category: 'aliments' },
  { text: 'Pizza', difficulty: 'easy', category: 'aliments' },
  { text: 'Chaise', difficulty: 'easy', category: 'objets' },
  { text: 'Table', difficulty: 'easy', category: 'objets' },
  { text: 'Fromage', difficulty: 'easy', category: 'aliments' },
  { text: 'Cactus', difficulty: 'easy', category: 'nature' },
  { text: 'Tortue', difficulty: 'easy', category: 'animaux' },
  { text: 'Télévision', difficulty: 'easy', category: 'objets' },
  { text: 'Échelle', difficulty: 'easy', category: 'objets' },
  { text: 'Ciseaux', difficulty: 'easy', category: 'objets' },
  { text: 'Glace', difficulty: 'easy', category: 'aliments' },
  { text: 'Élastique', difficulty: 'easy', category: 'objets' },
  // Moyen
  { text: 'Avion', difficulty: 'medium', category: 'transport' },
  { text: 'Montagne', difficulty: 'medium', category: 'nature' },
  { text: 'Bicyclette', difficulty: 'medium', category: 'transport' },
  { text: 'Robot', difficulty: 'medium', category: 'technologie' },
  { text: 'Licorne', difficulty: 'medium', category: 'fantastique' },
  { text: 'Plage', difficulty: 'medium', category: 'nature' },
  { text: 'Château', difficulty: 'medium', category: 'lieux' },
  { text: 'Fantôme', difficulty: 'medium', category: 'fantastique' },
  { text: 'Forêt', difficulty: 'medium', category: 'nature' },
  { text: 'Balançoire', difficulty: 'medium', category: 'objets' },
  { text: 'Coccinelle', difficulty: 'medium', category: 'animaux' },
  { text: 'Radio', difficulty: 'medium', category: 'objets' },
  { text: 'Parapluie', difficulty: 'medium', category: 'objets' },
  { text: 'Montre', difficulty: 'medium', category: 'objets' },
  { text: 'Lampe', difficulty: 'medium', category: 'objets' },
  { text: 'Arc en ciel', difficulty: 'medium', category: 'nature' },
  { text: 'Guitare', difficulty: 'medium', category: 'musique' },
  { text: 'Éléphant', difficulty: 'medium', category: 'animaux' },
  { text: 'Pingpong', difficulty: 'medium', category: 'sports' },
  { text: 'Zèbre', difficulty: 'medium', category: 'animaux' },
  { text: 'Pingouin', difficulty: 'medium', category: 'animaux' },
  { text: 'Igloo', difficulty: 'medium', category: 'lieux' },
  { text: 'Ordinateur', difficulty: 'medium', category: 'technologie' },
  { text: 'Drone', difficulty: 'medium', category: 'technologie' },
  { text: 'Feu de camp', difficulty: 'medium', category: 'nature' },
  { text: 'Batterie', difficulty: 'medium', category: 'musique' },
  { text: 'Fer à repasser', difficulty: 'medium', category: 'maison' },
  // Difficile
  { text: 'Caméléon', difficulty: 'hard', category: 'animaux' },
  { text: 'Kangourou', difficulty: 'hard', category: 'animaux' },
  { text: 'Astronaute', difficulty: 'hard', category: 'professions' },
  { text: 'Hélicoptère', difficulty: 'hard', category: 'transport' },
  { text: 'Xylophone', difficulty: 'hard', category: 'musique' },
  { text: 'Sphinx', difficulty: 'hard', category: 'mythologie' },
  { text: 'Boussole', difficulty: 'hard', category: 'objets' },
  { text: 'Parachute', difficulty: 'hard', category: 'objets' },
  { text: 'Micro onde', difficulty: 'hard', category: 'objets' },
  { text: 'Harmonica', difficulty: 'hard', category: 'musique' },
  { text: 'Statue de la Liberté', difficulty: 'hard', category: 'monuments' },
  { text: 'Montgolfière', difficulty: 'hard', category: 'transport' },
  { text: 'Scarabée', difficulty: 'hard', category: 'animaux' },
  { text: 'Lamantin', difficulty: 'hard', category: 'animaux' },
  { text: 'Sablier', difficulty: 'hard', category: 'objets' },
  { text: 'Pyramide', difficulty: 'hard', category: 'monuments' },
  { text: 'Camion poubelle', difficulty: 'hard', category: 'véhicules' },
  { text: 'Boussole', difficulty: 'hard', category: 'objets' },
  { text: 'Piano', difficulty: 'hard', category: 'musique' },
  { text: 'Taj Mahal', difficulty: 'hard', category: 'monuments' },
];

async function main() {
  console.log('Insertion de prompts...');
  await prisma.prompt.createMany({ data: prompts, skipDuplicates: true });
  console.log('Insertion terminée.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
