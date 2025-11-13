// Please ensure you replace '/placeholder.png' with actual image paths later.

export const mixedMenu = [
// Crepes
{
id: 1,
title: "Laza Special Crepe",
description: "Nutella / White Milk Chocolate / Pistachio Butter / Strawberry & Banana",
price: 15,
imageSrc: "/desserts/crepe.jpg",
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
imageSrc: "/desserts/lazawaffle.jpg",
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
imageSrc: "/desserts/ockywayspecialkunafa.png",
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
description: "Lotus Butter / Lotus Cookies",
price: 11,
imageSrc: "/placeholder.png",
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
description: "w/ Lemonade",
price: 7,
imageSrc: "/placeholder.png",
category: "Refreshers",
modifiers: [
{ name: "Size", options: ["Regular", "Large"] },
{ name: "Add-ons", options: ["Mint", "Lemon", "Extra Berries"] },
],
},
// Coffee
{
id: 6,
title: "Laza Latte",
description: "Hot & Iced",
price: 7,
imageSrc: "/placeholder.png",
category: "Coffee",
modifiers: [
{ name: "Size", options: ["Small", "Medium", "Large"] },
{ name: "Milk", options: ["Regular", "Oat", "Almond", "Coconut"] },
{ name: "Sweetness", options: ["No Sugar", "Regular", "Extra Sweet"] },
],
},
// Cakes
{
id: 7,
title: "Lava Cake",
description: "Description not provided on menu.",
price: 9,
imageSrc: "/placeholder.png",
category: "Cakes",
modifiers: [
{ name: "Add-ons", options: ["Ice Cream", "Whipped Cream", "Chocolate Sauce"] },
],
},
// Cups
{
id: 8,
title: "Dubai Chocolate Cup",
description: "Dubai Kunafa / Pistachio Kunafa filling / Milk Choc / White Choc Drizzle",
price: 14,
imageSrc: "/placeholder.png",
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
{ id: 1, title: "Latte", description: "Hot & Iced", price: 6, category: "Coffee", imageSrc: "/placeholder.png", modifiers: [] },
{ id: 2, title: "Cappuccino", description: "Hot & Iced", price: 6, category: "Coffee", imageSrc: "/placeholder.png", modifiers: [] },
{ id: 3, title: "Americano", description: "Hot & Iced", price: 6, category: "Coffee", imageSrc: "/placeholder.png", modifiers: [] },
{ id: 4, title: "Laza Latte", description: "Hot & Iced", price: 7, category: "Coffee", imageSrc: "/placeholder.png", modifiers: [] },
{ id: 5, title: "Spanish Latte", description: "Hot & Iced", price: 7, category: "Coffee", imageSrc: "/placeholder.png", modifiers: [] },
{ id: 6, title: "White Mocha Latte", description: "Hot & Iced", price: 7, category: "Coffee", imageSrc: "/placeholder.png", modifiers: [] },
{ id: 7, title: "Caramel Latte", description: "Hot & Iced", price: 7, category: "Coffee", imageSrc: "/placeholder.png", modifiers: [] },
{ id: 8, title: "Vanilla Matcha", description: "Hot & Iced", price: 7, category: "Coffee", imageSrc: "/placeholder.png", modifiers: [] },
{ id: 9, title: "Strawberry Matcha", description: "Hot & Iced", price: 7, category: "Coffee", imageSrc: "/placeholder.png", modifiers: [] },
{ id: 10, title: "Brown Sugar Shaken", description: "Hot & Iced", price: 7, category: "Coffee", imageSrc: "/placeholder.png", modifiers: [] },
{ id: 11, title: "Adani Tea", description: "Hot & Iced", price: 5, category: "Coffee", imageSrc: "/placeholder.png", modifiers: [] },
{ id: 12, title: "Adani Teapot", description: "Hot & Iced", price: 10, category: "Coffee", imageSrc: "/placeholder.png", modifiers: [] },

// --- SHAKES ---
{ id: 13, title: "Ferrero Shake", description: "Nutella / Crushed Hazelnuts / Ferrero Rocher", price: 11, category: "Shakes", imageSrc: "/placeholder.png", modifiers: [] },
{ id: 14, title: "Biscoff Shake", description: "Lotus Butter / Lotus Cookies", price: 11, category: "Shakes", imageSrc: "/placeholder.png", modifiers: [] },
{ id: 15, title: "Oreo Shake", description: "Crushed Oreos", price: 11, category: "Shakes", imageSrc: "/placeholder.png", modifiers: [] },
{ id: 16, title: "Dubai Chocolate Shake", description: "Nutella / Strawberry / Kunafa", price: 12, category: "Shakes", imageSrc: "/placeholder.png", modifiers: [] },
{ id: 17, title: "Kinder Shake", description: "Nutella / Kinder", price: 11, category: "Shakes", imageSrc: "/placeholder.png", modifiers: [] },
{ id: 18, title: "Strawberry Shortcake Shake", description: "Cheesecake / Strawberry Sauce", price: 11, category: "Shakes", imageSrc: "/placeholder.png", modifiers: [] },
{ id: 19, title: "Pistachio Shake", description: "Pistachio Butter / Crushed Pistachio", price: 12, category: "Shakes", imageSrc: "/placeholder.png", modifiers: [] },
{ id: 20, title: "Fudgin' Brownie Shake", description: "Nutella / Brownie Bites", price: 11, category: "Shakes", imageSrc: "/placeholder.png", modifiers: [] },
{ id: 21, title: "Red Velvet Shake", description: "Red Velvet Cake / Sprinkles", price: 11, category: "Shakes", imageSrc: "/placeholder.png", modifiers: [] },
{ id: 22, title: "Classic Shake", description: "Vanilla / Strawberry", price: 8, category: "Shakes", imageSrc: "/placeholder.png", modifiers: [] },

// --- REFRESHERS / MOJITOS ---
{ id: 23, title: "Blue Raspberry Refresher", description: "w/ Lemonade", price: 7, category: "Refreshers", imageSrc: "/placeholder.png", modifiers: [] },
{ id: 24, title: "Dragon Fruit Refresher", description: "w/ Lemonade", price: 7, category: "Refreshers", imageSrc: "/placeholder.png", modifiers: [] },
{ id: 25, title: "Peach Watermelon Refresher", description: "w/ Lemonade", price: 7, category: "Refreshers", imageSrc: "/placeholder.png", modifiers: [] },
{ id: 26, title: "Passion Fruit Refresher", description: "w/ Sprite", price: 7, category: "Refreshers", imageSrc: "/placeholder.png", modifiers: [] },
{ id: 27, title: "Strawberry Refresher", description: "w/ Sprite", price: 7, category: "Refreshers", imageSrc: "/placeholder.png", modifiers: [] },
{ id: 28, title: "Pina Colada Refresher", description: "w/ Sprite", price: 7, category: "Refreshers", imageSrc: "/placeholder.png", modifiers: [] },

// --- CREPES ---
{ id: 29, title: "Laza Special", description: "Nutella / White Milk Chocolate / Pistachio Butter / Strawberry & Banana", price: 15, category: "Crepes", imageSrc: "/placeholder.png", modifiers: [] },
{ id: 30, title: "Lotusella", description: "Nutella / Lotusella Butter / Biscoff / Strawberry & Banana", price: 13, category: "Crepes", imageSrc: "/crepes/lotusella.png", modifiers: [] },
{ id: 31, title: "Dubai Chocolate", description: "Chocolate / Pistachio Butter / Pistachio Kunafa filling", price: 15, category: "Crepes", imageSrc: "/placeholder.png", modifiers: [] },
{ id: 32, title: "Oreo", description: "Oreo / Nutella / Banana / White Chocolate", price: 11, category: "Crepes", imageSrc: "/crepes/oreo.png", modifiers: [] },
{ id: 33, title: "Cheesecake Melt", description: "Nutella / Cheesecake Bites / Strawberry", price: 12, category: "Crepes", imageSrc: "/crepes/cheesecakemelt.png", modifiers: [] },
{ id: 34, title: "Biscoff", description: "Lotus Butter / Banana / Biscoff Cookies / White Chocolate", price: 11, category: "Crepes", imageSrc: "/placeholder.png", modifiers: [] },
{ id: 35, title: "Pistachio", description: "Pistachio Butter / Crushed Pistachio", price: 12, category: "Crepes", imageSrc: "/placeholder.png", modifiers: [] },
{ id: 36, title: "Ferrero", description: "Chocolate / Ferrero / Strawberry", price: 12, category: "Crepes", imageSrc: "/placeholder.png", modifiers: [] },
{ id: 37, title: "Kinder", description: "Chocolate / Kinder Bueno / Kinder Stick / White Chocolate Drizzle", price: 12, category: "Crepes", imageSrc: "/crepes/kinder.png", modifiers: [] },
{ id: 38, title: "Triple Chocolate", description: "Milk Chocolate / White Chocolate / Dark Chocolate", price: 10, category: "Crepes", imageSrc: "/placeholder.png", modifiers: [] },
{ id: 39, title: "Strawberry Banana", description: "Chocolate / Strawberry / Banana", price: 11, category: "Crepes", imageSrc: "/placeholder.png", modifiers: [] },
{ id: 40, title: "Red Velvet", description: "Nutella / Red Velvet Cake / Strawberry / White Chocolate", price: 12, category: "Crepes", imageSrc: "/crepes/redvelvet.png", modifiers: [] },
{ id: 41, title: "Fudgin' Brownie", description: "Chocolate / Brownie Bites / Strawberry", price: 12, category: "Crepes", imageSrc: "/crepes/brownie.png", modifiers: [] },

// --- WAFFLES ---
{ id: 42, title: "Laza Special", description: "Nutella / White Milk Chocolate / Pistachio Butter / Strawberry & Banana", price: 15, category: "Waffles", imageSrc: "/desserts/lazawaffle.jpg", modifiers: [] },
{ id: 43, title: "Lotusella", description: "Nutella / Lotusella Butter / Biscoff / Strawberry & Banana", price: 13, category: "Waffles", imageSrc: "/desserts/lotuswaffle.jpg", modifiers: [] },
{ id: 44, title: "Dubai Chocolate", description: "Chocolate / Pistachio Butter / Pistachio Kunafa filling", price: 15, category: "Waffles", imageSrc: "/desserts/ockywaywaffle.jpg", modifiers: [] },
{ id: 45, title: "Oreo", description: "Oreo / Nutella / Banana / White Chocolate", price: 11, category: "Waffles", imageSrc: "/desserts/oreawaffle.jpg", modifiers: [] },
{ id: 46, title: "Cheesecake Melt", description: "Nutella / Cheesecake Bites / Strawberry", price: 12, category: "Waffles", imageSrc: "/desserts/cheesecakewaffle.jpg", modifiers: [] },
{ id: 47, title: "Biscoff", description: "Lotus Butter / Banana / Biscoff Cookies / White Chocolate", price: 11, category: "Waffles", imageSrc: "/desserts/lotuswaffle.jpg", modifiers: [] },
{ id: 48, title: "Pistachio", description: "Pistachio Butter / Crushed Pistachio", price: 12, category: "Waffles", imageSrc: "/placeholder.png", modifiers: [] },
{ id: 49, title: "Ferrero", description: "Chocolate / Ferrero / Strawberry", price: 12, category: "Waffles", imageSrc: "/desserts/ferrowaffle.jpg", modifiers: [] },
{ id: 50, title: "Kinder", description: "Chocolate / Kinder Bueno / Kinder Stick / White Chocolate Drizzle", price: 12, category: "Waffles", imageSrc: "/desserts/kinderwaffle.jpg", modifiers: [] },
{ id: 51, title: "Triple Chocolate", description: "Milk Chocolate / White Chocolate / Dark Chocolate", price: 10, category: "Waffles", imageSrc: "/desserts/wafflechoc.jpg", modifiers: [] },
{ id: 52, title: "Strawberry Banana", description: "Chocolate / Strawberry / Banana", price: 11, category: "Waffles", imageSrc: "/desserts/strawberrybannanawaffle.jpg", modifiers: [] },
{ id: 53, title: "Red Velvet", description: "Nutella / Red Velvet Cake / Strawberry / White Chocolate", price: 12, category: "Waffles", imageSrc: "/desserts/redvelvet.jpg", modifiers: [] },
{ id: 54, title: "Fudgin' Brownie", description: "Chocolate / Brownie Bites / Strawberry", price: 12, category: "Waffles", imageSrc: "/desserts/fudginwaffle.jpg", modifiers: [] },

// --- KUNAFA ---
{ id: 55, title: "Laza Special Kunafa", description: "Lotus Butter / Biscoff / Pistachio Butter / Crushed Pistachio / Crushed Oreo / Chocolate", price: 13, category: "Kunafa", imageSrc: "/desserts/ockywayspecialkunafa.png", modifiers: [] },
{ id: 56, title: "Laza Special W/ Ice Cream", description: "Lotus Butter / Biscoff / Pistachio Butter / Crushed Pistachio / Crushed Oreo / Chocolate w/ Ice Cream", price: 15, category: "Kunafa", imageSrc: "/desserts/ockywaykunafaicecream.png", modifiers: [] },
{ id: 57, title: "Pistachio Kunafa", description: "Pistachio Butter / Crushed Pistachio", price: 12, category: "Kunafa", imageSrc: "/desserts/pistachiokunafa.png", modifiers: [] },
{ id: 58, title: "Biscoff Kunafa", description: "Lotus Butter / Lotus Biscoff", price: 11, category: "Kunafa", imageSrc: "/desserts/lotuskunafa.png", modifiers: [] },
{ id: 59, title: "Triple Chocolate Kunafa", description: "Milk Chocolate / White Chocolate / Dark Chocolate", price: 11, category: "Kunafa", imageSrc: "/desserts/triplechocolatekunafa.png", modifiers: [] },
{ id: 60, title: "Milk Kunafa", description: "Kunafa / Honey / Milk / Crushed Pistachio", price: 11, category: "Kunafa", imageSrc: "/desserts/milkkunafa.jpg", modifiers: [] },
{ id: 61, title: "Nutella Kunafa", description: "Nutella Spread", price: 11, category: "Kunafa", imageSrc: "/desserts/nutellakunafa.png", modifiers: [] },
{ id: 62, title: "Classic Kunafa", description: "Syrup / Crushed Pistachio", price: 10, category: "Kunafa", imageSrc: "/desserts/classickunafa.jpg", modifiers: [] },

// --- CAKES ---
{ id: 63, title: "Mix Lukumate", description: "Description not provided on menu.", price: 11, category: "Cakes", imageSrc: "/placeholder.png", modifiers: [] },
{ id: 64, title: "Eclair", description: "Description not provided on menu.", price: 9, category: "Cakes", imageSrc: "/placeholder.png", modifiers: [] },
{ id: 65, title: "Lava Cake", description: "Description not provided on menu.", price: 9, category: "Cakes", imageSrc: "/placeholder.png", modifiers: [] },
{ id: 66, title: "Chocolate Chip Melt", description: "Description not provided on menu.", price: 9, category: "Cakes", imageSrc: "/placeholder.png", modifiers: [] },
{ id: 67, title: "Tiramisu", description: "Description not provided on menu.", price: 9, category: "Cakes", imageSrc: "/placeholder.png", modifiers: [] },
{ id: 68, title: "Brownie", description: "Description not provided on menu.", price: 9, category: "Cakes", imageSrc: "/desserts/brownie.jpg", modifiers: [] },
{ id: 69, title: "Chocolate Cake", description: "Description not provided on menu.", price: 9, category: "Cakes", imageSrc: "/placeholder.png", modifiers: [] },
{ id: 70, title: "Red Velvet Cake", description: "Description not provided on menu.", price: 9, category: "Cakes", imageSrc: "/desserts/redvelvet.jpg", modifiers: [] },
{ id: 71, title: "Milk Cake", description: "Description not provided on menu.", price: 9, category: "Cakes", imageSrc: "/placeholder.png", modifiers: [] },
{ id: 72, title: "Cheesecake", description: "Description not provided on menu.", price: 9, category: "Cakes", imageSrc: "/desserts/cheesecake.jpg", modifiers: [] },

// --- CUPS ---
{ id: 73, title: "Dubai Chocolate Cup", description: "Dubai Kunafa / Pistachio Kunafa filling / Milk Choc / White Choc Drizzle", price: 14, category: "Cups", imageSrc: "/desserts/dubai.jpg", modifiers: [] },
{ id: 74, title: "Strawberry Chocolate Cup", description: "Strawberry / Nutella / Milk / White Chocolate", price: 14, category: "Cups", imageSrc: "/desserts/straweberrycup.jpg", modifiers: [] },
];

// Shuffle the array using Fisher-Yates algorithm
const shuffled = [...allItems];
for (let i = shuffled.length - 1; i > 0; i--) {
const j = Math.floor(Math.random() * (i + 1));
[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
}

// Return the first 'limit' items
return shuffled.slice(0, limit);
}

export default mixedMenu
