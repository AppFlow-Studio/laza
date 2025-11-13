"use client"
import React, { useState } from "react";
import MenuCategoryCard from "./MenuCategoryCard";
import crepesMenu from "./data/crepesMenu";
import MenuItemCard from "./MenuItemCard";

interface Modifier {
  name: string;
  options: string[];
}

export const categories = [
  "Categories",
  "Crepes",
  "Waffles",
  "Kunafa",
  "Cups",
  "Cakes",
  "Cafe",
  "Shakes",
  "Refreshers / Mojitos",
];

export const wafflesMenu = [
  {
    title: "Kinder",
    description: "Nutella / Kinder Bueno / Kinder Stick / White Chocolate Drizzle",
    price: 11,
    imageSrc: "/desserts/kinder-waffle.jpg",
    modifiers: [
        { name: "Chocolate & Spread's", options: ["Nutella", "White Chocolate", "Lotus"] },
        { name: "Nuts", options: ["Pistachio", "Almonds", "Hazelnuts"] },
        { name: "Toppings", options: ["Strawberries", "Banana", "Oreo"] },
    ],
},
{
  title : 'Strawberry Banana Waffle',
  description : 'Strawberries / Banana / White Chocolate',
  price : 11,
  imageSrc : '/desserts/strawberry-waffle.jpg',
  modifiers : [
    { name : "Chocolate & Spread's", options : ["Nutella", "White Chocolate", "Lotus"] }
  ]
},
{
    title: "Red Velvet",
    description: "Red Velvet Cake Crumbles / Nutella / White Chocolate",
    price: 13,
    imageSrc: "/desserts/red-velvet-waffle.jpg",
    modifiers: [
        { name: "Chocolate & Spread's", options: ["Nutella", "White Chocolate", "Lotus"] },
        { name: "Nuts", options: ["Pistachio", "Almonds", "Hazelnuts"] },
        { name: "Toppings", options: ["Strawberries", "Banana", "Oreo"] },
    ],
},
{
  title : 'Ferrero Waffle',
  description : 'Nutella / Ferrero Rocher /Strawberries',
  price : 13,
  imageSrc : '/desserts/Ferrero-waffle.jpg',
  modifiers : [
    { name : "Chocolate & Spread's", options : ["Nutella", "White Chocolate", "Lotus"] }
  ]
},
{
    title: "Oreo",
    description: "Nutella / Oreo / Banana White Chocolate",
    price: 11,
    imageSrc: "/desserts/oreo-waffle.jpg",
    modifiers: [
        { name: "Chocolate & Spread's", options: ["Nutella", "White Chocolate", "Lotus"] },
        { name: "Nuts", options: ["Pistachio", "Almonds", "Hazelnuts"] },
        { name: "Toppings", options: ["Strawberries", "Banana", "Oreo"] },
    ],
},
{
  title : 'Laza Waffle',
  description : 'Nutella / Lotus Butter / Milk Chocolate / Pistachio / Banana',
  price : 16,
  imageSrc : '/desserts/laza-special-waffle.jpg',
  modifiers : [
    { name : "Chocolate & Spread's", options : ["Nutella", "White Chocolate", "Lotus"] }
  ]
},
{
    title: "Cheesecake Melt Waffle",
    description: "Nutella / Cheesecake Bites / Strawberries",
    price: 12,
    imageSrc: "/desserts/cheesecake-melt-waffle.jpg",
    modifiers: [
        { name: "Chocolate & Spread's", options: ["Nutella", "White Chocolate", "Lotus"] },
        { name: "Nuts", options: ["Pistachio", "Almonds", "Hazelnuts"] },
        { name: "Toppings", options: ["Strawberries", "Banana", "Oreo"] },
    ],
},
{
    title: "Lotus Waffle",
    description: "Nutella / Strawberries / Banana Lotus Butter / Biscoff",
    price: 13,
    imageSrc: "/desserts/lotusella-waffle.jpg",
    modifiers: [
        { name: "Chocolate & Spread's", options: ["Nutella", "White Chocolate", "Lotus"] },
        { name: "Nuts", options: ["Pistachio", "Almonds", "Hazelnuts"] },
        { name: "Toppings", options: ["Strawberries", "Banana", "Oreo"] },
    ],
},
  {
    title: "Dubai Chocolate Waffle",
    description: "Nutella / Pistachio Butter / Pistachio Kunafa Filling",
    price: 14,
    imageSrc: "/desserts/dubai-chocolate-waffle.jpg",
    modifiers: [
        { name: "Chocolate & Spread's", options: ["Nutella", "White Chocolate", "Lotus"] },
        { name: "Nuts", options: ["Pistachio", "Almonds", "Hazelnuts"] },
        { name: "Toppings", options: ["Strawberries", "Banana", "Oreo"] },
    ],
  },
  {
    title: "Pistachio Waffle",
    description: "Pistachio Butter / Crushed Pistachio / White Chocolate",
    price: 13,
    imageSrc: "/desserts/pistachio-waffle.jpg",
    modifiers: [
        { name: "Chocolate & Spread's", options: ["Nutella", "White Chocolate", "Lotus"] },
        { name: "Nuts", options: ["Pistachio", "Almonds", "Hazelnuts"] },
        { name: "Toppings", options: ["Strawberries", "Banana", "Oreo"] },
    ],
  },
{
    title: "Fudgin’ Waffle",
    description: "Brownie Bites / Strawberry / Nutella",
    price: 11,
    imageSrc: "/desserts/Fudgin-Brownie-waffle.jpg",
    modifiers: [
        { name: "Chocolate & Spread's", options: ["Nutella", "White Chocolate", "Lotus"] },
        { name: "Nuts", options: ["Pistachio", "Almonds", "Hazelnuts"] },
        { name: "Toppings", options: ["Strawberries", "Banana", "Oreo"] },
    ],
},
];

export const kunafaMenu = [
  {
    "imageSrc": "/desserts/laza-special-kunafa.jpg",
    "title": "Laza Special",
    "description": "Lotus Butter / Biscoff / Pistachio Butter Crushed Pistachio / Crushed Oreo / Chocolate",
    "price": 13,
    modifiers: [
      {
        name: "Ice Cream",
        options: ["Vanilla", "Pistachio", "No Ice Cream"]
      },
      {
        name: "Extra Toppings",
        options: ["Extra Pistachio", "Extra Lotus", "Extra Chocolate"]
      }
    ]
  },
  {
    "imageSrc": "/desserts/laza-special-kunafa-ice-cream.jpg",
    "title": "Laza Special W/ Ice Cream",
    "description": "Lotus Butter / Biscoff / Pistachio Butter Crushed Pistachio / Crushed Oreo / Chocolate with Ice Cream",
    "price": 15,
    modifiers: [
      {
        name: "Ice Cream Flavor",
        options: ["Vanilla", "Pistachio", "Chocolate"]
      },
      {
        name: "Sauce",
        options: ["Chocolate", "Lotus", "Caramel"]
      }
    ]
  },
  {
    "imageSrc": "/desserts/pistachio-kunafa.jpg",
    "title": "Pistachio",
    "description": "Pistachio Butter / Crushed Pistachio",
    "price": 12,
    modifiers: [
      {
        name: "Toppings",
        options: ["Extra Pistachio", "White Chocolate Drizzle"]
      }
    ]
  },
  {
    "imageSrc": "/desserts/biscoff-kunafa.jpg",
    "title": "Biscoff",
    "description": "Lotus Butter / Lotus Biscoff",
    "price": 11,
    modifiers: [
      {
        name: "Toppings",
        options: ["Extra Biscoff", "Crushed Lotus Cookies"]
      }
    ]
  },
  {
    "imageSrc": "/desserts/triple-chocolate-kunafa.jpg",
    "title": "Triple Chocolate",
    "description": "Milk Chocolate / White Chocolate Dark Chocolate",
    "price": 11,
    modifiers: [
      {
        name: "Chocolate Type",
        options: ["Milk Chocolate", "White Chocolate", "Dark Chocolate"]
      }
    ]
  },
  {
    "imageSrc": "/desserts/nutella-kunafa.jpg",
    "title": "Nutella Kunafa",
    "description": "Nutella / Chocolate Drizzle / Crushed Pistachio",
    "price": 12,
    modifiers: [
      {
        name: "Toppings",
        options: ["Extra Nutella", "Crushed Pistachio", "White Chocolate Drizzle"]
      }
    ]
  },
  {
    "imageSrc": "/desserts/milk-kunafa.png",
    "title": "Milk Kunfa",
    "description": "Honey / Milk / Crushed Pistachio",
    "price": 11,
    modifiers: [
      {
        name: "Milk Type",
        options: ["Whole Milk", "Oat Milk", "Almond Milk"]
      }
    ]
  },
  {
    "imageSrc": "/desserts/classic-kunafa.jpg",
    "title": "Classic Kunafa",
    "description": "Syrup / Crushed Pistachio",
    "price": 10,
    modifiers: [
      {
        name: "Syrup",
        options: ["Light", "Regular", "Extra"]
      }
    ]
  }
];

export const cupsMenu = [
  {
    "imageSrc": "/desserts/Strawberry-chocolate-cup.jpg",
    "title": "Strawberry Chocolate",
    "description": "Strawberry & Milk Choc & Drizzle w/ White Choc",
    "price": 11,
    modifiers: [
      {
        name: "Toppings",
        options: ["Extra Strawberries", "Crushed Nuts", "Oreo Crumbs"]
      },
      {
        name: "Sauce",
        options: ["White Chocolate", "Milk Chocolate", "Strawberry"]
      }
    ]
  },
  {
    "imageSrc": "/desserts/Dubai-Chocolate-cup.jpg",
    "title": "Dubai Chocolate",
    "description": "Strawberry W/ Dubai Kunafa Filling & Milk Choc & Drizzle with White Choc",
    "price": 16,
    modifiers: [
      {
        name: "Toppings",
        options: ["Extra Kunafa", "Extra Chocolate", "Pistachio"]
      }
    ]
  }
];

export const cakesMenu = [
  {
    "imageSrc": "/desserts/mix-lukumate.jpg",
    "title": "Mix Lukumate",
    "description": "Served with Cream",
    "price": 12,
    modifiers: [
      {
        name: "Sauce",
        options: ["Honey", "Chocolate", "Caramel"]
      }
    ]
  },
  {
    "imageSrc": "/desserts/Eclair.jpg",
    "title": "Eclair",
    "description": "Served with Ice Cream scoop",
    "price": 10,
    modifiers: [
      {
        name: "Ice Cream Flavor",
        options: ["Vanilla", "Chocolate", "Strawberry"]
      }
    ]
  },
  {
    "imageSrc": "/desserts/lava-cake.jpg",
    "title": "Lava Cake",
    "description": "Served with Ice Cream scoop",
    "price": 10,
    modifiers: [
      {
        name: "Ice Cream Flavor",
        options: ["Vanilla", "Chocolate", "Pistachio"]
      }
    ]
  },
  {
    "imageSrc": "/desserts/chocolate-chip-melt.jpg",
    "title": "Chocolate Chip Melt",
    "description": "Served with Ice Cream scoop",
    "price": 10,
    modifiers: [
      {
        name: "Toppings",
        options: ["Extra Chocolate Chips", "Caramel Drizzle"]
      }
    ]
  },
  {
    "imageSrc": "",
    "title": "Tiramisu",
    "description": "Served with Ice Cream scoop",
    "price": 10,
    modifiers: [
      {
        name: "Ice Cream Flavor",
        options: ["Vanilla", "Coffee", "Chocolate"]
      }
    ]
  },
  {
    "imageSrc": "/desserts/Brownie.jpg",
    "title": "Brownie",
    "description": "Served with Ice Cream scoop",
    "price": 10,
    modifiers: [
      {
        name: "Toppings",
        options: ["Walnuts", "Extra Chocolate", "Caramel"]
      }
    ]
  },
  {
    "imageSrc": "/desserts/triple-chocolate-cheesecake.jpg",
    "title": "Triple Chocolate Cheesecake",
    "description": "Served with Ice Cream scoop",
    "price": 11,
    modifiers: [
      {
        name: "Toppings",
        options: ["White Chocolate Drizzle", "Milk Chocolate Drizzle", "Dark Chocolate Drizzle"]
      }
    ]
  },
  {
    "imageSrc": "/desserts/chocolate-cake.jpg",
    "title": "Chocolate Cake",
    "description": "Served with Ice Cream scoop",
    "price": 10,
    modifiers: [
      {
        name: "Ice Cream Flavor",
        options: ["Vanilla", "Chocolate", "Strawberry"]
      }
    ]
  },
  {
    "imageSrc": "/desserts/red-velvet-cake.jpg",
    "title": "Red Velvet Cake",
    "description": "Served with Ice Cream scoop",
    "price": 10,
    modifiers: [
      {
        name: "Toppings",
        options: ["Cream Cheese Frosting", "White Chocolate Chips"]
      }
    ]
  },
  {
    "imageSrc": "",
    "title": "Milk Cake",
    "description": "Served with Ice Cream scoop",
    "price": 10,
    modifiers: [
      {
        name: "Milk Type",
        options: ["Whole Milk", "Oat Milk", "Almond Milk"]
      }
    ]
  },
  {
    "imageSrc": "",
    "title": "Cheesecake",
    "description": "Served with Ice Cream scoop",
    "price": 10,
    modifiers: [
      {
        name: "Toppings",
        options: ["Strawberry Sauce", "Blueberry Sauce", "Caramel"]
      }
    ]
  }
];

export const cafeMenu = [
  {
    "imageSrc": "/drinks/Americano.jpg",
    "title": "Americano",
    "description": "",
    "price": 6,
    modifiers: [
      {
        name: "Size",
        options: ["Small", "Medium", "Large"]
      },
      {
        name: "Milk Type",
        options: ["None", "Whole Milk", "Oat Milk", "Almond Milk"]
      }
    ]
  },
  {
    "imageSrc": "/drinks/latte-or-capuccino.jpg",
    "title": "Latte",
    "description": "",
    "price": 6,
    modifiers: [
      {
        name: "Milk Type",
        options: ["Whole Milk", "Oat Milk", "Almond Milk"]
      },
      {
        name: "Size",
        options: ["Small", "Medium", "Large"]
      }
    ]
  },
  {
    "imageSrc": "/drinks/latte-or-capuccino.jpg",
    "title": "Cappuccino",
    "description": "",
    "price": 6,
    modifiers: [
      {
        name: "Size",
        options: ["Small", "Medium", "Large"]
      },
      {
        name: "Milk Type",
        options: ["Whole Milk", "Oat Milk", "Almond Milk"]
      }
    ]
  },
  {
    "imageSrc": "/drinks/iced-pistachio-latte.jpg",
    "title": "Pistachio Latte",
    "description": "",
    "price": 8,
    modifiers: [
      {
        name: "Milk Type",
        options: ["Whole Milk", "Oat Milk", "Almond Milk"]
      },
      {
        name: "Sweetness",
        options: ["Regular", "Less Sweet", "Extra Sweet"]
      }
    ]
  },
  {
    "imageSrc": "/drinks/iced-americano.jpg",
    "title": "Iced Americano",
    "description": "",
    "price": 6,
    modifiers: [
      {
        name: "Size",
        options: ["Small", "Medium", "Large"]
      },
      {
        name: "Milk Type",
        options: ["None", "Whole Milk", "Oat Milk", "Almond Milk"]
      }
    ]
  },
  {
    "imageSrc": "",
    "title": "Spanish Latte",
    "description": "",
    "price": 7,
    modifiers: [
      {
        name: "Milk Type",
        options: ["Whole Milk", "Oat Milk", "Almond Milk"]
      },
      {
        name: "Sweetness",
        options: ["Regular", "Less Sweet", "Extra Sweet"]
      }
    ]
  },
  {
    "imageSrc": "",
    "title": "White Mocha Latte",
    "description": "",
    "price": 7,
    modifiers: [
      {
        name: "Milk Type",
        options: ["Whole Milk", "Oat Milk", "Almond Milk"]
      },
      {
        name: "Size",
        options: ["Small", "Medium", "Large"]
      }
    ]
  },
  {
    "imageSrc": "",
    "title": "Lotus Biscoff Latte",
    "description": "",
    "price": 7,
    modifiers: [
      {
        name: "Milk Type",
        options: ["Whole Milk", "Oat Milk", "Almond Milk"]
      },
      {
        name: "Sweetness",
        options: ["Regular", "Less Sweet", "Extra Sweet"]
      }
    ]
  },
  {
    "imageSrc": "/drinks/Caramel-latte.jpg",
    "title": "Caramel Latte",
    "description": "",
    "price": 7,
    modifiers: [
      {
        name: "Milk Type",
        options: ["Whole Milk", "Oat Milk", "Almond Milk"]
      },
      {
        name: "Size",
        options: ["Small", "Medium", "Large"]
      }
    ]
  },
  {
    "imageSrc": "/drinks/matcha-latte.jpg",
    "title": "Matcha Latte",
    "description": "",
    "price": 7,
    modifiers: [
      {
        name: "Milk Type",
        options: ["Whole Milk", "Oat Milk", "Almond Milk"]
      },
      {
        name: "Sweetness",
        options: ["Regular", "Less Sweet", "Extra Sweet"]
      }
    ]
  },
  {
    "imageSrc": "",
    "title": "Adeni",
    "description": "",
    "price": 7,
    modifiers: [
      {
        name: "Size",
        options: ["Small", "Medium", "Large"]
      },
      {
        name: "Sweetness",
        options: ["Regular", "Less Sweet", "Extra Sweet"]
      }
    ]
  },
  {
    "imageSrc": "",
    "title": "Brown Sugar",
    "description": "",
    "price": 7,
    modifiers: [
      {
        name: "Milk Type",
        options: ["Whole Milk", "Oat Milk", "Almond Milk"]
      },
      {
        name: "Sweetness",
        options: ["Regular", "Less Sweet", "Extra Sweet"]
      }
    ]
  },
  {
    "imageSrc": "",
    "title": "Laza Latte",
    "description": "",
    "price": 7,
    modifiers: [
      {
        name: "Milk Type",
        options: ["Whole Milk", "Oat Milk", "Almond Milk"]
      },
      {
        name: "Sweetness",
        options: ["Regular", "Less Sweet", "Extra Sweet"]
      }
    ]
  },
  {
    "imageSrc": "",
    "title": "Hot",
    "description": "",
    "price": 7,
    modifiers: [
      {
        name: "Size",
        options: ["Small", "Medium", "Large"]
      }
    ]
  },
  {
    "imageSrc": "",
    "title": "Iced",
    "description": "",
    "price": 7,
    modifiers: [
      {
        name: "Size",
        options: ["Small", "Medium", "Large"]
      }
    ]
  }
];

export const shakesMenu = [
  {
    "imageSrc": "/drinks/Ferrero-Shake.jpg",
    "title": "Ferrero Shake",
    "description": "Vanilla Ice Cream / Nutella Crushed Hazelnuts / Ferrero Rocher",
    "price": 10,
    modifiers: [
      {
        name: "Toppings",
        options: ["Extra Ferrero", "Crushed Hazelnuts", "Chocolate Sauce"]
      }
    ]
  },
  {
    "imageSrc": "/drinks/Biscoff-Shake.jpg",
    "title": "Biscoff Shake",
    "description": "Vanilla Ice Cream / Lotus Butter / Lotus Cookies",
    "price": 10,
    modifiers: [
      {
        name: "Toppings",
        options: ["Extra Lotus", "Crushed Lotus Cookies", "Caramel Sauce"]
      }
    ]
  },
  {
    "imageSrc": "/drinks/Oreo-Shake.jpg",
    "title": "Oreo Shake",
    "description": "Vanilla Ice Cream / Oreos",
    "price": 11,
    modifiers: [
      {
        name: "Toppings",
        options: ["Extra Oreo", "Chocolate Sauce", "Whipped Cream"]
      }
    ]
  },
  {
    "imageSrc": "/drinks/Dubai-Chocolate-Shake.jpg",
    "title": "Dubai Chocolate",
    "description": "Pistachio, Kunafa",
    "price": 10,
    modifiers: [
      {
        name: "Toppings",
        options: ["Extra Pistachio", "Kunafa Crumbs"]
      }
    ]
  },
  {
    "imageSrc": "/drinks/Kinder-Shake.jpg",
    "title": "Kinder Shake",
    "description": "Vanilla Ice Cream / Nutella / Kinder",
    "price": 11,
    modifiers: [
      {
        name: "Toppings",
        options: ["Extra Kinder", "Nutella Drizzle"]
      }
    ]
  },
  {
    "imageSrc": "/drinks/Strawberry-Shortcake-Shake.jpg",
    "title": "Strawberry Shortcake",
    "description": "Vanilla Ice Cream, Cheesecake, Strawberry Sauce",
    "price": 11,
    modifiers: [
      {
        name: "Toppings",
        options: ["Extra Strawberry", "Cheesecake Crumbs"]
      }
    ]
  },
  {
    "imageSrc": "/drinks/pistachio-shake.jpg",
    "title": "Pistachio",
    "description": "Vanilla Ice Cream / Pistachio Butter Crushed Pistachio",
    "price": 12,
    modifiers: [
      {
        name: "Toppings",
        options: ["Extra Pistachio", "White Chocolate Drizzle"]
      }
    ]
  },
  {
    "imageSrc": "/drinks/chocolate-shake.jpg",
    "title": "Chocolate Shake",
    "description": "Chocolate Ice Cream / Nutella / Chocolate Sauce",
    "price": 9,
    modifiers: [
      {
        name: "Toppings",
        options: ["Whipped Cream", "Chocolate Chips", "Sprinkles"]
      }
    ]
  },
  {
    "imageSrc": "/drinks/Fudgin-Brownie-Shake.jpg",
    "title": "Fudgin' Brownie Shake",
    "description": "Vanilla Ice Cream & Brownie Bites, Nutella",
    "price": 11,
    "imagePosition": "top",
    modifiers: [
      {
        name: "Toppings",
        options: ["Extra Brownie", "Nutella Drizzle"]
      }
    ]
  },
  {
    "imageSrc": "/drinks/Red-Velvet-Shake.jpg",
    "title": "Red Velvet Shake",
    "description": "Vanilla Ice Cream / Red Velvet Cake / Cream Cheese Frosting",
    "price": 11,
    modifiers: [
      {
        name: "Toppings",
        options: ["Extra Red Velvet", "Cream Cheese Frosting", "White Chocolate Drizzle"]
      }
    ]
  },
  {
    "imageSrc": "/drinks/Strawberry-Shake.jpg",
    "title": "Strawberry Shake",
    "description": "Vanilla Ice Cream / Strawberries / Strawberry Sauce",
    "price": 9,
    modifiers: [
      {
        name: "Toppings",
        options: ["Whipped Cream", "Fresh Strawberries", "Sprinkles"]
      }
    ]
  },
  {
    "imageSrc": "",
    "title": "Ruby Shake",
    "description": "Vanilla Ice Cream, Red Velvet Cake & Sprinkles",
    "price": 11,
    modifiers: [
      {
        name: "Toppings",
        options: ["Extra Red Velvet", "Sprinkles"]
      }
    ]
  },
  {
    "imageSrc": "",
    "title": "Classic Shake",
    "description": "Vanilla / Chocolate / Strawberry",
    "price": 7,
    modifiers: [
      {
        name: "Flavor",
        options: ["Vanilla", "Chocolate", "Strawberry"]
      },
      {
        name: "Toppings",
        options: ["Whipped Cream", "Sprinkles"]
      }
    ]
  }
];
export const refreshersMenu = [
  {
    "imageSrc": "",
    "title": "Redberry Refresher",
    "description": "Strawberry / Raspberry",
    "price": 7,
    modifiers: [
      {
        name: "Size",
        options: ["Regular", "Large"]
      },
      {
        name: "Add-ons",
        options: ["Mint", "Lemon", "Extra Berries"]
      }
    ]
  },
  {
    "imageSrc": "/drinks/pina-colada-refresher.jpg",
    "title": "Piña Colada Refresher",
    "description": "Coconut / Pineapple",
    "price": 7,
    modifiers: [
      {
        name: "Size",
        options: ["Regular", "Large"]
      },
      {
        name: "Add-ons",
        options: ["Mint", "Pineapple Chunks"]
      }
    ]
  },
  {
    "imageSrc": "",
    "title": "Summer Refresher",
    "description": "Peach / Watermelon",
    "price": 7,
    modifiers: [
      {
        name: "Size",
        options: ["Regular", "Large"]
      },
      {
        name: "Add-ons",
        options: ["Mint", "Peach Slices"]
      }
    ]
  },
  {
    "imageSrc": "/drinks/passion-fruit-refresher.jpg",
    "title": "Passion Fruit Refresher",
    "description": "Passion Fruit / Strawberry / Mango",
    "price": 7,
    modifiers: [
      {
        name: "Size",
        options: ["Regular", "Large"]
      },
      {
        name: "Add-ons",
        options: ["Mint", "Mango Cubes"]
      }
    ]
  },
  {
    "imageSrc": "/drinks/Blue-Raspberry-Refresher.jpg",
    "title": "Blue Raspberry",
    "description": "Blue Raspberry",
    "price": 7,
    modifiers: [
      {
        name: "Size",
        options: ["Regular", "Large"]
      },
      {
        name: "Add-ons",
        options: ["Mint", "Lemon"]
      }
    ]
  },
  {
    "imageSrc": "/drinks/dragon-fruit-refresher.jpg",
    "title": "Dragon Fruit",
    "description": "Dragon Fruit",
    "price": 7,
    modifiers: [
      {
        name: "Size",
        options: ["Regular", "Large"]
      },
      {
        name: "Add-ons",
        options: ["Mint", "Dragon Fruit Cubes"]
      }
    ]
  }
];


const allCategories = [
  { title: "Crepes", imageSrc: "/CrepesCat.png" },
  { title: "Waffles", imageSrc: "/WafflesCat.png" },
  { title: "Kunafa", imageSrc: "/KunafaCat.png" },
  { title: "Cups", imageSrc: "/CupsCat.png" },
  { title: "Cakes", imageSrc: "/CakesCat.png" },
  { title: "Cafe", imageSrc: "/CafeCat.png" },
  { title: "Shakes", imageSrc: "/ShakesCat.png" },
  { title: "Refreshers / Mojitos", imageSrc: "/RefreshersCat.png" },
];

const menuData: Record<string, { title: string; imageSrc?: string; price: number; description: string; modifiers: Modifier[]; imagePosition?: string }[]> = {
  Crepes: crepesMenu,
  Waffles: wafflesMenu,
  Kunafa: kunafaMenu,
  Cups: cupsMenu,
  Cakes: cakesMenu,
  Cafe: cafeMenu,
  Shakes: shakesMenu,
  "Refreshers / Mojitos": refreshersMenu,
};

const getAllMenuCards = () => Object.values(menuData).flat();
const MenuCategories: React.FC = () => {
  const [selected, setSelected] = useState(categories[0]);

  const showAll = selected === "Categories";
  const cardsToShow = showAll ? allCategories : menuData[selected] || [];

  return (
    <div className="w-full flex flex-col md:flex-row gap-8 md:gap-16 mt-8 max-w-[1440px] mx-auto px-4 pb-28 sm:pb-24 md:pb-20">
      {/* Sidebar */}
      <aside className="md:w-64 w-full md:sticky top-24">
        <ul className="space-y-2">
          {categories.map((cat) => (
            <li key={cat}>
              <button
                className={`w-full text-left px-2 py-2 rounded-lg font-medium text-base transition-all duration-200 transform
                  ${selected === cat ? "bg-[#f3f6fa] text-black scale-105 font-bold" : "text-gray-700 hover:bg-gray-100 hover:scale-105 hover:font-bold"}
                `}
                onClick={() => setSelected(cat)}
              >
                {cat}
              </button>
            </li>
          ))}
        </ul>
      </aside>
      {/* Cards */}
      <div className="flex flex-col gap-8">
        <p className="text-2xl font-500 ">Menu {selected !== "Categories" && <span className="">/</span>}  {selected !== "Categories" && <span className="text-[#2C4B7E]">{selected}</span>}</p>
        {
          selected === "Categories" && <main className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-8">
            {cardsToShow.map((item, idx) => (
              <MenuCategoryCard onClick={() => setSelected(item.title)} key={idx} title={item.title} imageSrc={item.imageSrc} hoverBlue />
            ))}
          </main>}
        {
          selected !== "Categories" &&
          <main className="flex-1 grid grid-cols-1 lg:grid-cols-3 md:grid-cols-2 gap-8">
            {menuData[selected].map((item, idx) => (
              <MenuItemCard key={idx} title={item.title} price={item.price} description={item.description} imageSrc={item.imageSrc || ""} modifiers={item.modifiers} imagePosition={item.imagePosition} />
            ))}
          </main>
        }
      </div>
    </div>
  );
};

export default MenuCategories; 