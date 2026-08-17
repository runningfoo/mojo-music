import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const sourceDir = "/Users/ryan/Downloads/MOJO PICS";
const outputDir = path.resolve("public/assets");

const images = [
  ["hero", "_DSC0680.JPG", 2200],
  ["story", "_DSC0716.JPG", 1600],
  ["live-wide", "_DSC0722.JPG", 1800],
  ["duo-indoor", "Image 12.jpg", 1500],
  ["duo-smile", "IMG_8411.JPG", 1500],
  ["vocalist", "Image.jpg", 1000],
  ["guitarist", "Image 6.jpeg", 1000],
  ["sunset", "IMG_1815.jpeg", 1400],
  ["portrait-duo", "IMG_1783.jpeg", 1300],
  ["live-close", "_DSC0716.JPG", 1400],
  ["live-laugh", "_DSC0693 2.JPG", 1600],
  ["live-full", "_DSC0655.JPG", 1600]
];

await mkdir(outputDir, { recursive: true });

await Promise.all(images.map(async ([name, file, width]) => {
  const image = sharp(path.join(sourceDir, file)).rotate().resize({ width, withoutEnlargement: true });
  await Promise.all([
    image.clone().webp({ quality: 82 }).toFile(path.join(outputDir, `${name}.webp`)),
    image.clone().avif({ quality: 58, effort: 5 }).toFile(path.join(outputDir, `${name}.avif`)),
  ]);
}));

const editorialHero = sharp(path.join(outputDir, "hero-editorial.png"));
await Promise.all([
  editorialHero.clone().webp({ quality: 90 }).toFile(path.join(outputDir, "hero-editorial.webp")),
  editorialHero.clone().avif({ quality: 70, effort: 5 }).toFile(path.join(outputDir, "hero-editorial.avif")),
]);

await sharp(path.join(outputDir, "mojo-logo.png"))
  .resize({ width: 320, height: 320, fit: "contain", withoutEnlargement: true })
  .webp({ quality: 92, alphaQuality: 100 })
  .toFile(path.join(outputDir, "mojo-logo.webp"));
