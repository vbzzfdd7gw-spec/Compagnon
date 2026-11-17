import { NodeIO } from '@gltf-transform/core';
import { prune, dedup, resample, unpartition, quantize, weld } from '@gltf-transform/functions';
import fs from 'fs';
function supprimerAnim(a) { a.listChannels().forEach(c => c.dispose()); a.listSamplers().forEach(sm => { const i = sm.getInput(), o = sm.getOutput(); sm.dispose(); if (i && !i.listParents().some(p => p.propertyType !== 'Root')) i.dispose(); if (o && !o.listParents().some(p => p.propertyType !== 'Root')) o.dispose(); }); a.dispose(); }
const KK = '../kk';
const ADV = `${KK}/adv/addons/kaykit_character_pack_adventures/Characters/gltf`;
const SQ = `${KK}/KayKit-Character-Pack-Skeletons-1.0/addons/kaykit_character_pack_skeletons`;
const DJ = `${KK}/KayKit-Dungeon-Remastered-1.0/addons/kaykit_dungeon_remastered/Assets/gltf`;
const SORTIE = '/home/user/Compagnon/donjon/modeles';
fs.mkdirSync(SORTIE, { recursive: true });
const io = new NodeIO();
io.setLogger({ debug(){}, info(){}, warn(){}, error: console.error });

const ANIMS = ['Idle', 'Idle_Combat', '2H_Melee_Idle', 'Unarmed_Idle',
  '1H_Melee_Attack_Chop', '1H_Melee_Attack_Slice_Diagonal', '1H_Melee_Attack_Stab', '2H_Melee_Attack_Chop',
  'Dualwield_Melee_Attack_Stab', 'Unarmed_Melee_Attack_Punch_A', '1H_Ranged_Shoot', 'Throw',
  'Spellcast_Shoot', 'Spellcast_Raise', 'Spellcast_Summon', 'Hit_A', 'Hit_B', 'Block', 'Dodge_Backward',
  'Death_A', 'Death_A_Pose', 'Death_C_Skeletons', 'Death_C_Pose', 'Lie_StandUp', 'Cheer', 'Use_Item', 'Taunt',
  'Skeletons_Awaken_Standing'];

async function ecrire(nom, doc) {
  await doc.transform(dedup(), prune(), weld(), quantize({ quantizePosition: 14, quantizeNormal: 10, quantizeTexcoord: 12 }));
  const glb = await io.writeBinary(doc);
  const js = `(window.GLB = window.GLB || {})[${JSON.stringify(nom)}] = ${JSON.stringify(Buffer.from(glb).toString('base64'))};\n`;
  fs.writeFileSync(`${SORTIE}/${nom}.js`, js);
  console.log(nom.padEnd(18), (glb.byteLength / 1024).toFixed(0).padStart(6), 'Ko');
}

// Personnages : sans animations (sauf le squelette guerrier, qui porte les animations partagées)
const persos = { knight: `${ADV}/Knight.glb`, mage: `${ADV}/Mage.glb`, barbarian: `${ADV}/Barbarian.glb`, rogue: `${ADV}/Rogue.glb`,
  rogue_hooded: `${ADV}/Rogue_Hooded.glb`, skeleton_mage: `${SQ}/Characters/gltf/Skeleton_Mage.glb` };
for (const [nom, f] of Object.entries(persos)) {
  const doc = await io.read(f);
  doc.getRoot().listAnimations().forEach(supprimerAnim);
  await ecrire(nom, doc);
}
{
  const doc = await io.read(`${SQ}/Characters/gltf/Skeleton_Warrior.glb`);
  doc.getRoot().listAnimations().forEach(a => { if (!ANIMS.includes(a.getName())) supprimerAnim(a); });
  await doc.transform(resample({ tolerance: 1e-3 }));
  console.log('animations gardées :', doc.getRoot().listAnimations().map(a => a.getName()).join(', '));
  await ecrire('skeleton_warrior', doc);
}
// Armes des squelettes
for (const n of ['Skeleton_Blade', 'Skeleton_Shield_Small_A', 'Skeleton_Staff']) {
  await ecrire(n.toLowerCase(), await io.read(`${SQ}/Assets/gltf/${n}.gltf`));
}
// Décor : toutes les pièces dans un seul fichier, une scène par pièce
const pieces = fs.readdirSync(DJ).filter(f => f.endsWith('.glb'));
const decor = await io.read(`${DJ}/${pieces[0]}`);
decor.getRoot().listScenes()[0].setName(pieces[0].replace(/\.gltf\.glb|\.glb/, ''));
for (const p of pieces.slice(1)) {
  const d = await io.read(`${DJ}/${p}`);
  d.getRoot().listScenes()[0].setName(p.replace(/\.gltf\.glb|\.glb/, ''));
  decor.merge(d);
}
await decor.transform(unpartition());
await ecrire('donjon', decor);
