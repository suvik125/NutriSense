// api/mcp.js
// NutriSense Model Context Protocol (MCP) Server (Streamable HTTP / JSON-RPC 2.0)

const FOOD_DB = [
  { key: 'bhuna_khichuri', name: 'Bhuna Khichuri (1 plate)', calories: 420, proteinG: 12, carbsG: 62, fatG: 14, allergens: [] },
  { key: 'kacchi_biryani', name: 'Kacchi Biryani (1 plate)', calories: 680, proteinG: 28, carbsG: 74, fatG: 30, allergens: ['dairy', 'nuts'] },
  { key: 'rui_fish_curry', name: 'Rui Fish Curry (1 bowl)', calories: 290, proteinG: 26, carbsG: 8, fatG: 17, allergens: ['fish'] },
  { key: 'dal_bhat', name: 'Plain Rice & Masoor Dal', calories: 340, proteinG: 11, carbsG: 66, fatG: 3, allergens: [] },
  { key: 'chicken_soup', name: 'Clear Chicken & Ginger Soup', calories: 180, proteinG: 19, carbsG: 10, fatG: 6, allergens: [] },
];

const RECOVERY_GUIDES = {
  fever: 'High hydration (electrolytes, coconut water), soft easily digestible carbs (Suji, soft Khichuri), lean protein (chicken soup). Avoid heavy oils.',
  cold: 'Warm ginger-tulsi broth, vitamin-C rich fruits, garlic-infused dal, warm fluids to clear congestion.',
  stomach: 'BRAT-inspired gentle foods: soft rice, ripe banana, plain yogurt/curd, boiled potato. Avoid spicy/fried dishes.',
  sore_throat: 'Warm soothing liquids, mashed vegetables, soft oats/khichuri, honey-lemon warm water.',
  fatigue: 'Iron and B-vitamin rich meals: spinach, lentils (dal), eggs, nuts, complex carbs for sustained energy.',
};

const MCP_TOOLS = [
  {
    name: 'lookup_food_nutrition',
    description: 'Search South Asian & global dishes in NutriSense DB for calories, macros, and allergens.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Dish name (e.g. Kacchi Biryani, Rui Fish Curry, Khichuri)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'check_allergy_conflicts',
    description: 'Check if a dish conflicts with a user allergy list.',
    inputSchema: {
      type: 'object',
      properties: {
        foodName: { type: 'string' },
        userAllergies: { type: 'array', items: { type: 'string' } },
      },
      required: ['foodName', 'userAllergies'],
    },
  },
  {
    name: 'calculate_nutrition_targets',
    description: 'Calculate BMR, TDEE, and BMI using the Mifflin-St Jeor equation.',
    inputSchema: {
      type: 'object',
      properties: {
        weightKg: { type: 'number' },
        heightCm: { type: 'number' },
        age: { type: 'number' },
        gender: { type: 'string', enum: ['male', 'female'] },
        activityMultiplier: { type: 'number', default: 1.375 },
      },
      required: ['weightKg', 'heightCm', 'age', 'gender'],
    },
  },
  {
    name: 'get_recovery_meal_plan',
    description: 'Get illness-adapted dietary protocol for fever, cold, stomach upset, sore throat, or fatigue.',
    inputSchema: {
      type: 'object',
      properties: {
        condition: { type: 'string', enum: ['fever', 'cold', 'stomach', 'sore_throat', 'fatigue'] },
      },
      required: ['condition'],
    },
  },
];

const MCP_RESOURCES = [
  {
    uri: 'nutrisense://catalog/bangladeshi-foods',
    name: 'Bangladeshi & Global Food Nutrition Catalog',
    mimeType: 'application/json',
    description: 'Structured calorie, macro, and allergen records used by NutriSense RAG & YOLO scanner.',
  },
  {
    uri: 'nutrisense://rules/illness-recovery',
    name: 'Clinical-Informed Illness Recovery Diet Rules',
    mimeType: 'application/json',
    description: 'Dietary adaptation rules for 5 common illness recovery states.',
  },
];

function executeTool(name, args = {}) {
  switch (name) {
    case 'lookup_food_nutrition': {
      const q = String(args.query || '').toLowerCase();
      const matches = FOOD_DB.filter((f) => f.name.toLowerCase().includes(q) || f.key.includes(q));
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              matches.length
                ? matches
                : { message: 'No exact match found', available: FOOD_DB.map((f) => f.name) }
            ),
          },
        ],
      };
    }

    case 'check_allergy_conflicts': {
      const q = String(args.foodName || '').toLowerCase();
      const userAllergies = (args.userAllergies || []).map((a) => String(a).toLowerCase());
      const food = FOOD_DB.find((f) => f.name.toLowerCase().includes(q) || f.key.includes(q));
      const conflicts = food ? food.allergens.filter((a) => userAllergies.includes(a)) : [];
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              food: food?.name || args.foodName,
              safe: conflicts.length === 0,
              conflicts,
            }),
          },
        ],
      };
    }

    case 'calculate_nutrition_targets': {
      const { weightKg, heightCm, age, gender, activityMultiplier = 1.375 } = args;
      const bmr =
        gender === 'female'
          ? 10 * weightKg + 6.25 * heightCm - 5 * age - 161
          : 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
      const tdee = Math.round(bmr * activityMultiplier);
      const bmi = Number((weightKg / ((heightCm / 100) ** 2)).toFixed(1));
      return {
        content: [{ type: 'text', text: JSON.stringify({ bmr: Math.round(bmr), tdee, bmi }) }],
      };
    }

    case 'get_recovery_meal_plan': {
      const cond = String(args.condition || 'fever').toLowerCase();
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              condition: cond,
              guidance: RECOVERY_GUIDES[cond] || RECOVERY_GUIDES.fever,
              disclaimer: 'Informational nutrition guidance only — not medical advice.',
            }),
          },
        ],
      };
    }

    default:
      throw new Error(`Unknown MCP tool: ${name}`);
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Mcp-Session-Id');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return res.status(200).json({
      server: 'nutrisense-mcp-server',
      version: '1.0.0',
      transport: 'Streamable HTTP (JSON-RPC 2.0)',
      toolsCount: MCP_TOOLS.length,
      resourcesCount: MCP_RESOURCES.length,
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const rpc = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const { id = null, method, params = {} } = rpc;

    if (method === 'initialize') {
      return res.status(200).json({
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {}, resources: {} },
          serverInfo: { name: 'nutrisense-mcp-server', version: '1.0.0' },
        },
      });
    }

    if (method === 'notifications/initialized') {
      return res.status(200).json({ jsonrpc: '2.0', result: {} });
    }

    if (method === 'tools/list') {
      return res.status(200).json({ jsonrpc: '2.0', id, result: { tools: MCP_TOOLS } });
    }

    if (method === 'tools/call') {
      const result = executeTool(params.name, params.arguments);
      return res.status(200).json({ jsonrpc: '2.0', id, result });
    }

    if (method === 'resources/list') {
      return res.status(200).json({ jsonrpc: '2.0', id, result: { resources: MCP_RESOURCES } });
    }

    if (method === 'resources/read') {
      if (params.uri === 'nutrisense://catalog/bangladeshi-foods') {
        return res.status(200).json({
          jsonrpc: '2.0',
          id,
          result: { contents: [{ uri: params.uri, mimeType: 'application/json', text: JSON.stringify(FOOD_DB) }] },
        });
      }
      if (params.uri === 'nutrisense://rules/illness-recovery') {
        return res.status(200).json({
          jsonrpc: '2.0',
          id,
          result: { contents: [{ uri: params.uri, mimeType: 'application/json', text: JSON.stringify(RECOVERY_GUIDES) }] },
        });
      }
      return res.status(404).json({ jsonrpc: '2.0', id, error: { code: -32602, message: 'Resource not found' } });
    }

    return res.status(400).json({ jsonrpc: '2.0', id, error: { code: -32601, message: `Method not found: ${method}` } });
  } catch (err) {
    return res.status(500).json({ jsonrpc: '2.0', id: null, error: { code: -32603, message: err.message } });
  }
}
