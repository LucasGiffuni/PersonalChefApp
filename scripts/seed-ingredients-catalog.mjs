import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.EXPO_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const USDA_API_KEY = process.env.USDA_API_KEY
const LIMIT = Number(process.env.SEED_LIMIT || 200)
const DRY_RUN = process.env.DRY_RUN === '1'

if (!SUPABASE_URL) throw new Error('Missing SUPABASE_URL (or EXPO_PUBLIC_SUPABASE_URL)')
if (!SUPABASE_SERVICE_ROLE_KEY && !DRY_RUN) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')
if (!USDA_API_KEY) throw new Error('Missing USDA_API_KEY')

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY || 'dry-run')

const CANDIDATES = [
  // Verduras y hortalizas
  ['papa', 'potato'], ['boniato', 'sweet potato'], ['zanahoria', 'carrot'], ['cebolla', 'onion'],
  ['ajo', 'garlic'], ['tomate', 'tomato'], ['lechuga', 'lettuce'], ['espinaca', 'spinach'],
  ['acelga', 'chard'], ['rúcula', 'arugula'], ['pepino', 'cucumber'], ['berenjena', 'eggplant'],
  ['zapallito', 'zucchini'], ['zapallo', 'pumpkin'], ['calabaza', 'squash'], ['brócoli', 'broccoli'],
  ['coliflor', 'cauliflower'], ['repollo', 'cabbage'], ['col rizada', 'kale'], ['apio', 'celery'],
  ['puerro', 'leek'], ['morrón rojo', 'red bell pepper'], ['morrón verde', 'green bell pepper'],
  ['morron amarillo', 'yellow bell pepper'], ['choclo', 'corn'], ['arveja', 'green peas'],
  ['haba', 'fava beans'], ['remolacha', 'beet'], ['rabanito', 'radish'], ['nabo', 'turnip'],
  ['jengibre', 'ginger root'], ['batata', 'sweet potato'], ['chaucha', 'green beans'],
  ['brotes de soja', 'bean sprouts'], ['hongo champiñón', 'mushroom'], ['portobello', 'portobello mushroom'],
  ['cebolla morada', 'red onion'], ['cebolla de verdeo', 'spring onion'], ['perejil', 'parsley'],
  ['cilantro', 'cilantro'], ['albahaca', 'basil'], ['menta', 'mint'], ['romero', 'rosemary'],
  ['tomillo', 'thyme'], ['orégano', 'oregano'], ['eneldo', 'dill'], ['laurel', 'bay leaf'],
  ['ají', 'chili pepper'], ['jalapeño', 'jalapeno pepper'], ['palta', 'avocado'],

  // Frutas
  ['manzana', 'apple'], ['banana', 'banana'], ['pera', 'pear'], ['durazno', 'peach'],
  ['ciruela', 'plum'], ['damasco', 'apricot'], ['frutilla', 'strawberry'], ['arándano', 'blueberry'],
  ['frambuesa', 'raspberry'], ['mora', 'blackberry'], ['uva', 'grapes'], ['naranja', 'orange'],
  ['mandarina', 'mandarin'], ['limón', 'lemon'], ['lima', 'lime'], ['pomelo', 'grapefruit'],
  ['ananá', 'pineapple'], ['mango', 'mango'], ['papaya', 'papaya'], ['kiwi', 'kiwi fruit'],
  ['melón', 'melon'], ['sandía', 'watermelon'], ['coco', 'coconut'], ['higo', 'fig'],
  ['granada', 'pomegranate'], ['cereza', 'cherry'], ['caqui', 'persimmon'],

  // Carnes y pescados
  ['pollo', 'chicken breast'], ['muslo de pollo', 'chicken thigh'], ['carne de vaca', 'beef'],
  ['lomo de vaca', 'beef tenderloin'], ['carne picada vacuna', 'ground beef'],
  ['carne de cerdo', 'pork'], ['lomo de cerdo', 'pork tenderloin'], ['costilla de cerdo', 'pork ribs'],
  ['pavo', 'turkey breast'], ['cordero', 'lamb'], ['jamón cocido', 'ham'], ['tocino', 'bacon'],
  ['chorizo', 'sausage'], ['atún', 'tuna'], ['salmón', 'salmon'], ['merluza', 'hake'],
  ['bacalao', 'cod'], ['sardina', 'sardine'], ['langostino', 'shrimp'], ['mejillón', 'mussels'],
  ['calamar', 'squid'], ['pulpo', 'octopus'],

  // Huevos y lácteos
  ['huevo', 'egg'], ['clara de huevo', 'egg white'], ['yema de huevo', 'egg yolk'],
  ['leche', 'milk'], ['leche descremada', 'skim milk'], ['leche entera', 'whole milk'],
  ['yogur natural', 'plain yogurt'], ['yogur griego', 'greek yogurt'], ['queso mozzarella', 'mozzarella cheese'],
  ['queso cheddar', 'cheddar cheese'], ['queso parmesano', 'parmesan cheese'], ['queso crema', 'cream cheese'],
  ['queso ricota', 'ricotta cheese'], ['manteca', 'butter'], ['crema de leche', 'heavy cream'],
  ['kéfir', 'kefir'], ['dulce de leche', 'milk caramel spread'],

  // Cereales, harinas y panificados
  ['arroz blanco', 'white rice'], ['arroz integral', 'brown rice'], ['arroz yamaní', 'brown rice'],
  ['quinoa', 'quinoa'], ['cuscús', 'couscous'], ['avena', 'oats'], ['sémola', 'semolina'],
  ['harina de trigo', 'wheat flour'], ['harina integral', 'whole wheat flour'],
  ['harina de maíz', 'corn flour'], ['fécula de maíz', 'cornstarch'], ['almidón de papa', 'potato starch'],
  ['pan blanco', 'white bread'], ['pan integral', 'whole wheat bread'], ['pan de centeno', 'rye bread'],
  ['tortilla de trigo', 'flour tortilla'], ['tortilla de maíz', 'corn tortilla'], ['galleta de agua', 'crackers'],
  ['pasta seca', 'dry pasta'], ['fideos spaghetti', 'spaghetti'], ['fideos penne', 'penne pasta'],
  ['ñoquis', 'gnocchi'], ['polenta', 'polenta'],

  // Legumbres y secos
  ['lenteja', 'lentils'], ['garbanzo', 'chickpeas'], ['poroto negro', 'black beans'],
  ['poroto blanco', 'white beans'], ['poroto rojo', 'kidney beans'], ['soja', 'soybeans'],
  ['arveja seca', 'split peas'], ['maní', 'peanuts'], ['almendra', 'almonds'],
  ['nuez', 'walnuts'], ['avellana', 'hazelnuts'], ['pistacho', 'pistachios'],
  ['castaña de cajú', 'cashews'], ['semilla de girasol', 'sunflower seeds'],
  ['semilla de calabaza', 'pumpkin seeds'], ['semilla de chía', 'chia seeds'],
  ['semilla de lino', 'flaxseed'], ['sésamo', 'sesame seeds'],

  // Aceites, grasas y condimentos
  ['aceite de oliva', 'olive oil'], ['aceite de girasol', 'sunflower oil'], ['aceite de canola', 'canola oil'],
  ['aceite de coco', 'coconut oil'], ['vinagre de vino', 'wine vinegar'], ['vinagre de manzana', 'apple cider vinegar'],
  ['sal', 'salt'], ['sal marina', 'sea salt'], ['azúcar', 'sugar'], ['azúcar rubia', 'brown sugar'],
  ['miel', 'honey'], ['mostaza', 'mustard'], ['mayonesa', 'mayonnaise'], ['ketchup', 'ketchup'],
  ['salsa de soja', 'soy sauce'], ['salsa inglesa', 'worcestershire sauce'], ['caldo de verduras', 'vegetable broth'],
  ['caldo de pollo', 'chicken broth'], ['pimienta negra', 'black pepper'], ['pimentón', 'paprika'],
  ['comino', 'cumin'], ['cúrcuma', 'turmeric'], ['curry', 'curry powder'], ['canela', 'cinnamon'],
  ['nuez moscada', 'nutmeg'], ['clavo de olor', 'cloves'], ['ajo en polvo', 'garlic powder'],
  ['cebolla en polvo', 'onion powder'], ['orégano seco', 'dried oregano'], ['perejil seco', 'dried parsley'],

  // Enlatados y básicos de despensa
  ['tomate triturado', 'crushed tomatoes'], ['tomate en lata', 'canned tomatoes'],
  ['puré de tomate', 'tomato puree'], ['garbanzo en lata', 'canned chickpeas'],
  ['poroto en lata', 'canned beans'], ['choclo en lata', 'canned corn'],
  ['atún en lata', 'canned tuna'], ['aceituna verde', 'green olives'], ['aceituna negra', 'black olives'],
  ['pepino en vinagre', 'pickles'], ['alcaparra', 'capers'], ['pasas de uva', 'raisins'],
  ['dátil', 'dates'], ['ciruela pasa', 'prunes'], ['cacao amargo', 'cocoa powder'],
  ['chocolate amargo', 'dark chocolate'], ['gelatina sin sabor', 'gelatin'],
  ['levadura seca', 'dry yeast'], ['polvo de hornear', 'baking powder'], ['bicarbonato de sodio', 'baking soda'],

  // Extras muy comunes
  ['tofu', 'tofu'], ['tempeh', 'tempeh'], ['seitan', 'seitan'],
  ['leche de almendras', 'almond milk'], ['leche de soja', 'soy milk'], ['leche de avena', 'oat milk'],
  ['mantequilla de maní', 'peanut butter'], ['mermelada de frutilla', 'strawberry jam'],
  ['mermelada de durazno', 'peach jam'], ['arroz arborio', 'arborio rice'],
  ['jamón crudo', 'prosciutto'], ['queso azul', 'blue cheese'], ['queso feta', 'feta cheese'],
  ['queso gouda', 'gouda cheese'], ['queso provolone', 'provolone cheese'],
  ['fideos arroz', 'rice noodles'], ['fideos udon', 'udon noodles'], ['fideos soba', 'soba noodles'],
  ['harina de garbanzo', 'chickpea flour'], ['harina de arroz', 'rice flour'],
]

function normalize(text) {
  return String(text || '').toLowerCase().trim().replace(/\s+/g, ' ')
}

function uniquePairs(pairs) {
  const seen = new Set()
  const result = []
  for (const [es, en] of pairs) {
    const key = `${normalize(es)}::${normalize(en)}`
    if (seen.has(key)) continue
    seen.add(key)
    result.push([es, en])
  }
  return result
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function isRaw(desc) {
  return /(^|[\s,;()\-])raw([\s,;()\-]|$)/i.test(String(desc || ''))
}

function pickNutrient(food, names) {
  const nutrients = Array.isArray(food?.foodNutrients) ? food.foodNutrients : []
  const hit = nutrients.find(n => names.includes(String(n?.nutrientName || '').toLowerCase()))
  return Number(hit?.value) || 0
}

async function searchUsdaRaw(englishQuery) {
  const url = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${encodeURIComponent(USDA_API_KEY)}`
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: englishQuery,
      pageSize: 10,
      dataType: ['Foundation', 'SR Legacy', 'Survey (FNDDS)', 'Branded'],
    }),
  })
  if (!resp.ok) {
    const txt = await resp.text()
    throw new Error(`USDA ${resp.status}: ${txt}`)
  }
  const data = await resp.json()
  const foods = Array.isArray(data?.foods) ? data.foods : []
  const preferred = foods.find(f => isRaw(f?.description)) || foods[0] || null
  return preferred
}

async function upsertIngredient(row) {
  const { error } = await supabase
    .from('ingredients_catalog')
    .upsert(row, { onConflict: 'fdc_id' })
  if (error) throw error
}

async function main() {
  const list = uniquePairs(CANDIDATES).slice(0, LIMIT)
  console.log(`Seeding ${list.length} ingredientes...`)

  let ok = 0
  let fail = 0
  const failures = []

  for (const [es, en] of list) {
    try {
      const food = await searchUsdaRaw(en)
      if (!food) throw new Error('No result from USDA')

      const row = {
        name: normalize(es),
        display_name: `${es} (raw)`,
        fdc_id: Number(food.fdcId),
        calories_per_100g: pickNutrient(food, ['energy']),
        protein_per_100g: pickNutrient(food, ['protein']),
        fat_per_100g: pickNutrient(food, ['total lipid (fat)', 'fatty acids, total saturated']),
        carbs_per_100g: pickNutrient(food, ['carbohydrate, by difference']),
      }

      if (!DRY_RUN) await upsertIngredient(row)
      ok += 1
      console.log(`✓ ${es} <- ${food.description} (${food.fdcId})`)
    } catch (err) {
      fail += 1
      failures.push({ es, en, error: String(err) })
      console.error(`✗ ${es} (${en}) => ${String(err)}`)
    }
    await delay(150)
  }

  console.log(`\nDone. OK=${ok} FAIL=${fail}`)
  if (failures.length) {
    console.log('\nErrores:')
    failures.slice(0, 30).forEach(f => console.log(`- ${f.es} (${f.en}): ${f.error}`))
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
