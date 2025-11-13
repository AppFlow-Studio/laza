// Please ensure you replace '/placeholder.png' with actual image paths later.

export const mixedMenu = [
// Crepes
{
id: 1,
title: "Laza Special Crepe",
description: "Nutella / White Milk Chocolate / Pistachio Butter / Strawberry & Banana",
price: 15,
imageSrc: "/crepes/Laza-Special-Crepe.jpg",
category: "Crepes",
modifiers: [
{ name: "Chocolate & Spread's", options: ["Nutella", "White Chocolate", "Lotus"] },
{ name: "Nuts", options: ["Pistachio", "Almonds", "Hazelnuts"] },
{ name: "Toppings", options: ["Strawberries", "Banana", "Oreo"] },
],
},
// Waffles
{
id: 2,
title: "Laza Special",
description: "Nutella / White Milk Chocolate / Pistachio Butter / Strawberry & Banana",
price: 15,
imageSrc: "/desserts/laza-special-waffle.jpg",
category: "Waffles",
modifiers: [
{ name: "Chocolate & Spread's", options: ["Nutella", "White Chocolate", "Lotus"] },
{ name: "Nuts", options: ["Pistachio", "Almonds", "Hazelnuts"] },
{ name: "Toppings", options: ["Strawberries", "Banana", "Oreo"] },
],
},
// Kunafa
{
id: 3,
title: "Laza Special Kunafa",
description: "Lotus Butter / Biscoff / Pistachio Butter / Crushed Pistachio / Crushed Oreo / Chocolate",
price: 13,
imageSrc: "/desserts/laza-special-kunafa.jpg",
category: "Kunafa",
modifiers: [
{ name: "Toppings", options: ["Extra Chocolate", "Pistachio", "Ice Cream"] },
{ name: "Temperature", options: ["Hot", "Room Temperature"] },
],
},
// Shakes
{
id: 4,
title: "Biscoff Shake",
description: "Vanilla Ice Cream / Lotus Butter / Lotus Cookies",
price: 10,
imageSrc: "/drinks/Biscoff-Shake.jpg",
category: "Shakes",
modifiers: [
{ name: "Size", options: ["Small", "Medium", "Large"] },
{ name: "Add-ons", options: ["Extra Whipped Cream", "Chocolate Drizzle", "Nuts"] },
],
},
// Refreshers
{
id: 5,
title: "Blue Raspberry Refresher",
description: "Blue Raspberry",
price: 7,
imageSrc: "/drinks/Blue-Raspberry-Refresher.jpg",
category: "Refreshers",
modifiers: [
{ name: "Size", options: ["Regular", "Large"] },
{ name: "Add-ons", options: ["Mint", "Lemon", "Extra Berries"] },
],
},
// Cakes
{
id: 7,
title: "Lava Cake",
description: "Served with Ice Cream scoop",
price: 10,
imageSrc: "/desserts/lava-cake.jpg",
category: "Cakes",
modifiers: [
{ name: "Add-ons", options: ["Ice Cream", "Whipped Cream", "Chocolate Sauce"] },
],
},
// Cups
{
id: 8,
title: "Dubai Chocolate Cup",
description: "Strawberry W/ Dubai Kunafa Filling & Milk Choc & Drizzle with White Choc",
price: 16,
imageSrc: "/desserts/Dubai-Chocolate-cup.jpg",
category: "Cups",
modifiers: [
{ name: "Size", options: ["Small", "Large"] },
{ name: "Add-ons", options: ["Extra Cream", "Chocolate Chips", "Nuts"] },
],
},
];

// This function now works with the consolidated and corrected menu.
export function getRandomMenuItems(limit: number = 7) {
const allItems = [
// --- CAFE (Hot & Iced) ---
{ id: 1, title: "Americano", description: "", price: 6, category: "Coffee", imageSrc: "/drinks/Americano.jpg", modifiers: [] },
{ id: 2, title: "Latte", description: "", price: 6, category: "Coffee", imageSrc: "/drinks/latte-or-capuccino.jpg", modifiers: [] },
{ id: 3, title: "Cappuccino", description: "", price: 6, category: "Coffee", imageSrc: "/drinks/latte-or-capuccino.jpg", modifiers: [] },
{ id: 4, title: "Iced Americano", description: "", price: 6, category: "Coffee", imageSrc: "/drinks/iced-americano.jpg", modifiers: [] },
{ id: 5, title: "Pistachio Latte", description: "", price: 8, category: "Coffee", imageSrc: "/drinks/iced-pistachio-latte.jpg", modifiers: [] },
{ id: 6, title: "Caramel Latte", description: "", price: 7, category: "Coffee", imageSrc: "/drinks/Caramel-latte.jpg", modifiers: [] },
{ id: 7, title: "Matcha Latte", description: "", price: 7, category: "Coffee", imageSrc: "/drinks/matcha-latte.jpg", modifiers: [] },

// --- SHAKES ---
{ id: 13, title: "Ferrero Shake", description: "Vanilla Ice Cream / Nutella Crushed Hazelnuts / Ferrero Rocher", price: 10, category: "Shakes", imageSrc: "/drinks/Ferrero-Shake.jpg", modifiers: [] },
{ id: 14, title: "Biscoff Shake", description: "Vanilla Ice Cream / Lotus Butter / Lotus Cookies", price: 10, category: "Shakes", imageSrc: "/drinks/Biscoff-Shake.jpg", modifiers: [] },
{ id: 15, title: "Oreo Shake", description: "Vanilla Ice Cream / Oreos", price: 11, category: "Shakes", imageSrc: "/drinks/Oreo-Shake.jpg", modifiers: [] },
{ id: 16, title: "Dubai Chocolate", description: "Pistachio, Kunafa", price: 10, category: "Shakes", imageSrc: "/drinks/Dubai-Chocolate-Shake.jpg", modifiers: [] },
{ id: 17, title: "Kinder Shake", description: "Vanilla Ice Cream / Nutella / Kinder", price: 11, category: "Shakes", imageSrc: "/drinks/Kinder-Shake.jpg", modifiers: [] },
{ id: 18, title: "Strawberry Shortcake", description: "Vanilla Ice Cream, Cheesecake, Strawberry Sauce", price: 11, category: "Shakes", imageSrc: "/drinks/Strawberry-Shortcake-Shake.jpg", modifiers: [] },
{ id: 19, title: "Pistachio", description: "Vanilla Ice Cream / Pistachio Butter Crushed Pistachio", price: 12, category: "Shakes", imageSrc: "/drinks/pistachio-shake.jpg", modifiers: [] },
{ id: 20, title: "Fudgin' Brownie Shake", description: "Vanilla Ice Cream & Brownie Bites, Nutella", price: 11, category: "Shakes", imageSrc: "/drinks/Fudgin-Brownie-Shake.jpg", modifiers: [] },
{ id: 21, title: "Red Velvet Shake", description: "Vanilla Ice Cream / Red Velvet Cake / Cream Cheese Frosting", price: 11, category: "Shakes", imageSrc: "/drinks/Red-Velvet-Shake.jpg", modifiers: [] },
{ id: 22, title: "Chocolate Shake", description: "Chocolate Ice Cream / Nutella / Chocolate Sauce", price: 9, category: "Shakes", imageSrc: "/drinks/chocolate-shake.jpg", modifiers: [] },
{ id: 23, title: "Strawberry Shake", description: "Vanilla Ice Cream / Strawberries / Strawberry Sauce", price: 9, category: "Shakes", imageSrc: "/drinks/Strawberry-Shake.jpg", modifiers: [] },

// --- REFRESHERS / MOJITOS ---
{ id: 24, title: "Blue Raspberry", description: "Blue Raspberry", price: 7, category: "Refreshers", imageSrc: "/drinks/Blue-Raspberry-Refresher.jpg", modifiers: [] },
{ id: 25, title: "Dragon Fruit", description: "Dragon Fruit", price: 7, category: "Refreshers", imageSrc: "/drinks/dragon-fruit-refresher.jpg", modifiers: [] },
{ id: 26, title: "Passion Fruit Refresher", description: "Passion Fruit / Strawberry / Mango", price: 7, category: "Refreshers", imageSrc: "/drinks/passion-fruit-refresher.jpg", modifiers: [] },
{ id: 27, title: "Piña Colada Refresher", description: "Coconut / Pineapple", price: 7, category: "Refreshers", imageSrc: "/drinks/pina-colada-refresher.jpg", modifiers: [] },

// --- CREPES ---
{ id: 29, title: "Laza Special", description: "Nutella / White Milk Chocolate / Pistachio Butter / Strawberry & Banana", price: 15, category: "Crepes", imageSrc: "/crepes/Laza-Special-Crepe.jpg", modifiers: [] },
{ id: 30, title: "Lotusella", description: "Nutella / Lotusella Butter / Biscoff / Strawberry & Banana", price: 13, category: "Crepes", imageSrc: "/crepes/lotusella-crepe.jpg", modifiers: [] },
{ id: 31, title: "Dubai Chocolate", description: "Chocolate / Pistachio Butter / Pistachio Kunafa filling", price: 15, category: "Crepes", imageSrc: "/crepes/dubai-chocolate-crepe.jpg", modifiers: [] },
{ id: 32, title: "Oreo", description: "Oreo / Nutella / Banana / White Chocolate", price: 11, category: "Crepes", imageSrc: "/crepes/oreo-crepe.jpg", modifiers: [] },
{ id: 33, title: "Cheesecake Melt", description: "Nutella / Cheesecake Bites / Strawberry", price: 12, category: "Crepes", imageSrc: "/crepes/cheesecake-melt-crepe.jpg", modifiers: [] },
{ id: 35, title: "Pistachio", description: "Pistachio Butter / Crushed Pistachio", price: 12, category: "Crepes", imageSrc: "/crepes/Pistachio-crepe.jpg", modifiers: [] },
{ id: 36, title: "Ferrero", description: "Chocolate / Ferrero / Strawberry", price: 12, category: "Crepes", imageSrc: "/crepes/ferrero-crepe.jpg", modifiers: [] },
{ id: 37, title: "Kinder", description: "Chocolate / Kinder Bueno / Kinder Stick / White Chocolate Drizzle", price: 12, category: "Crepes", imageSrc: "/crepes/kinder-crepe.jpg", modifiers: [] },
{ id: 38, title: "Triple Chocolate", description: "Milk Chocolate / White Chocolate / Dark Chocolate", price: 10, category: "Crepes", imageSrc: "/crepes/triple-chocolate-crepe.jpg", modifiers: [] },
{ id: 39, title: "Strawberry Banana", description: "Chocolate / Strawberry / Banana", price: 11, category: "Crepes", imageSrc: "/crepes/strawberry-banana-crepe.jpg", modifiers: [] },
{ id: 40, title: "Red Velvet", description: "Nutella / Red Velvet Cake / Strawberry / White Chocolate", price: 12, category: "Crepes", imageSrc: "/crepes/red-velvet-crepe.jpg", modifiers: [] },
{ id: 41, title: "Fudgin' Brownie", description: "Chocolate / Brownie Bites / Strawberry", price: 12, category: "Crepes", imageSrc: "/crepes/fudgin-brownie-crepe.jpg", modifiers: [] },
{ id: 42, title: "Nutella", description: "Nutella / Strawberries / Banana / Powdered Sugar", price: 11, category: "Crepes", imageSrc: "/crepes/nutella-crepe.jpg", modifiers: [] },
{ id: 43, title: "Strawberry Cheesecake", description: "Cheesecake Bites / Strawberry Sauce / White Chocolate Drizzle", price: 12, category: "Crepes", imageSrc: "/crepes/strawberry-cheesecake-crepe.jpg", modifiers: [] },

// --- WAFFLES ---
{ id: 44, title: "Kinder", description: "Nutella / Kinder Bueno / Kinder Stick / White Chocolate Drizzle", price: 11, category: "Waffles", imageSrc: "/desserts/kinder-waffle.jpg", modifiers: [] },
{ id: 45, title: "Strawberry Banana Waffle", description: "Strawberries / Banana / White Chocolate", price: 11, category: "Waffles", imageSrc: "/desserts/strawberry-waffle.jpg", modifiers: [] },
{ id: 46, title: "Red Velvet", description: "Red Velvet Cake Crumbles / Nutella / White Chocolate", price: 13, category: "Waffles", imageSrc: "/desserts/red-velvet-waffle.jpg", modifiers: [] },
{ id: 47, title: "Ferrero Waffle", description: "Nutella / Ferrero Rocher /Strawberries", price: 13, category: "Waffles", imageSrc: "/desserts/Ferrero-waffle.jpg", modifiers: [] },
{ id: 48, title: "Oreo", description: "Nutella / Oreo / Banana White Chocolate", price: 11, category: "Waffles", imageSrc: "/desserts/oreo-waffle.jpg", modifiers: [] },
{ id: 49, title: "Laza Waffle", description: "Nutella / Lotus Butter / Milk Chocolate / Pistachio / Banana", price: 16, category: "Waffles", imageSrc: "/desserts/laza-special-waffle.jpg", modifiers: [] },
{ id: 50, title: "Cheesecake Melt Waffle", description: "Nutella / Cheesecake Bites / Strawberries", price: 12, category: "Waffles", imageSrc: "/desserts/cheesecake-melt-waffle.jpg", modifiers: [] },
{ id: 51, title: "Lotus Waffle", description: "Nutella / Strawberries / Banana Lotus Butter / Biscoff", price: 13, category: "Waffles", imageSrc: "/desserts/lotusella-waffle.jpg", modifiers: [] },
{ id: 52, title: "Dubai Chocolate Waffle", description: "Nutella / Pistachio Butter / Pistachio Kunafa Filling", price: 14, category: "Waffles", imageSrc: "/desserts/dubai-chocolate-waffle.jpg", modifiers: [] },
{ id: 53, title: "Pistachio Waffle", description: "Pistachio Butter / Crushed Pistachio / White Chocolate", price: 13, category: "Waffles", imageSrc: "/desserts/pistachio-waffle.jpg", modifiers: [] },
{ id: 54, title: "Fudgin' Waffle", description: "Brownie Bites / Strawberry / Nutella", price: 11, category: "Waffles", imageSrc: "/desserts/Fudgin-Brownie-waffle.jpg", modifiers: [] },

// --- KUNAFA ---
{ id: 55, title: "Laza Special", description: "Lotus Butter / Biscoff / Pistachio Butter Crushed Pistachio / Crushed Oreo / Chocolate", price: 13, category: "Kunafa", imageSrc: "/desserts/laza-special-kunafa.jpg", modifiers: [] },
{ id: 56, title: "Laza Special W/ Ice Cream", description: "Lotus Butter / Biscoff / Pistachio Butter Crushed Pistachio / Crushed Oreo / Chocolate with Ice Cream", price: 15, category: "Kunafa", imageSrc: "/desserts/laza-special-kunafa-ice-cream.jpg", modifiers: [] },
{ id: 57, title: "Pistachio", description: "Pistachio Butter / Crushed Pistachio", price: 12, category: "Kunafa", imageSrc: "/desserts/pistachio-kunafa.jpg", modifiers: [] },
{ id: 58, title: "Biscoff", description: "Lotus Butter / Lotus Biscoff", price: 11, category: "Kunafa", imageSrc: "/desserts/biscoff-kunafa.jpg", modifiers: [] },
{ id: 59, title: "Triple Chocolate", description: "Milk Chocolate / White Chocolate Dark Chocolate", price: 11, category: "Kunafa", imageSrc: "/desserts/triple-chocolate-kunafa.jpg", modifiers: [] },
{ id: 60, title: "Milk Kunfa", description: "Honey / Milk / Crushed Pistachio", price: 11, category: "Kunafa", imageSrc: "/desserts/milk-kunafa.png", modifiers: [] },
{ id: 61, title: "Nutella Kunafa", description: "Nutella / Chocolate Drizzle / Crushed Pistachio", price: 12, category: "Kunafa", imageSrc: "/desserts/nutella-kunafa.jpg", modifiers: [] },
{ id: 62, title: "Classic Kunafa", description: "Syrup / Crushed Pistachio", price: 10, category: "Kunafa", imageSrc: "/desserts/classic-kunafa.jpg", modifiers: [] },

// --- CAKES ---
{ id: 63, title: "Mix Lukumate", description: "Served with Cream", price: 12, category: "Cakes", imageSrc: "/desserts/mix-lukumate.jpg", modifiers: [] },
{ id: 64, title: "Eclair", description: "Served with Ice Cream scoop", price: 10, category: "Cakes", imageSrc: "/desserts/Eclair.jpg", modifiers: [] },
{ id: 65, title: "Lava Cake", description: "Served with Ice Cream scoop", price: 10, category: "Cakes", imageSrc: "/desserts/lava-cake.jpg", modifiers: [] },
{ id: 66, title: "Chocolate Chip Melt", description: "Served with Ice Cream scoop", price: 10, category: "Cakes", imageSrc: "/desserts/chocolate-chip-melt.jpg", modifiers: [] },
{ id: 68, title: "Brownie", description: "Served with Ice Cream scoop", price: 10, category: "Cakes", imageSrc: "/desserts/Brownie.jpg", modifiers: [] },
{ id: 69, title: "Chocolate Cake", description: "Served with Ice Cream scoop", price: 10, category: "Cakes", imageSrc: "/desserts/chocolate-cake.jpg", modifiers: [] },
{ id: 70, title: "Red Velvet Cake", description: "Served with Ice Cream scoop", price: 10, category: "Cakes", imageSrc: "/desserts/red-velvet-cake.jpg", modifiers: [] },
{ id: 72, title: "Triple Chocolate Cheesecake", description: "Served with Ice Cream scoop", price: 11, category: "Cakes", imageSrc: "/desserts/triple-chocolate-cheesecake.jpg", modifiers: [] },

// --- CUPS ---
{ id: 73, title: "Dubai Chocolate", description: "Strawberry W/ Dubai Kunafa Filling & Milk Choc & Drizzle with White Choc", price: 16, category: "Cups", imageSrc: "/desserts/Dubai-Chocolate-cup.jpg", modifiers: [] },
{ id: 74, title: "Strawberry Chocolate", description: "Strawberry & Milk Choc & Drizzle w/ White Choc", price: 11, category: "Cups", imageSrc: "/desserts/Strawberry-chocolate-cup.jpg", modifiers: [] },
];

// Filter out items without images (empty strings or placeholders)
const itemsWithImages = allItems.filter(item => item.imageSrc && item.imageSrc !== "" && item.imageSrc !== "/placeholder.png");

// Shuffle the array using Fisher-Yates algorithm
const shuffled = [...itemsWithImages];
for (let i = shuffled.length - 1; i > 0; i--) {
const j = Math.floor(Math.random() * (i + 1));
[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
}

// Return the first 'limit' items
return shuffled.slice(0, limit);
}

export default mixedMenu
