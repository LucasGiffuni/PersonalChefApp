export type AppLanguage = 'es' | 'en';

type TranslationParams = Record<string, string | number>;

const translations = {
  es: {
    tab_home: 'Inicio',
    tab_create: 'Recetas',
    tab_profile: 'Perfil',
    edit_recipe_title: 'Editar receta',

    home_title: 'Recetas',
    home_subtitle: 'Cociná mejor con el costo de tus ingredientes.',
    offline_mode: 'Modo sin conexión: mostrando datos en caché',
    no_recipes: 'No se encontraron recetas',
    try_search_or_category: 'Probá cambiando el término o la categoría.',
    all_category: 'Todas',
    load_recipes_failed: 'No se pudieron cargar las recetas',

    login_kicker: 'Chef PWA',
    login_title: 'Bienvenido de nuevo',
    login_subtitle: 'Iniciá sesión para seguir gestionando tus recetas.',
    email: 'Email',
    password: 'Contraseña',
    sign_in: 'Iniciar sesión',
    create_account: 'Crear cuenta',
    email_password_required: 'Email y contraseña son obligatorios',
    welcome_back: 'Bienvenido de nuevo',
    failed_login: 'No se pudo iniciar sesión',

    register_title: 'Crear cuenta',
    register_subtitle: 'Configurá tu perfil para sincronizar recetas entre dispositivos.',
    confirm_password: 'Confirmar contraseña',
    already_have_account: '¿Ya tenés una cuenta?',
    create_account_button: 'Crear cuenta',
    passwords_not_match: 'Las contraseñas no coinciden',
    account_created: 'Cuenta creada',
    failed_register: 'No se pudo crear la cuenta',

    profile_kicker: 'Cuenta',
    profile_title: 'Perfil',
    profile_subtitle: 'Cuenta y sesión',
    user_id: 'ID de usuario',
    unknown: 'Desconocido',
    logout: 'Cerrar sesión',
    failed_logout: 'No se pudo cerrar sesión',
    settings_title: 'Configuración',
    language_title: 'Idioma',
    language_subtitle: 'Elegí el idioma de la aplicación',
    language_es: 'Español',
    language_en: 'Inglés',

    detail_not_found: 'Receta no encontrada',
    detail_no_description: 'No hay descripción disponible.',
    minutes_suffix: 'min',
    servings: 'Porciones',
    ingredients: 'Ingredientes',
    steps: 'Pasos',
    calories_total: 'Calorías totales',
    calories_serving: 'Calorías/porción',
    protein_total: 'Proteína total (g)',
    protein_serving: 'Proteína/porción (g)',
    fat_total: 'Grasa total (g)',
    fat_serving: 'Grasa/porción (g)',
    carbs_total: 'Carbohidratos total (g)',
    carbs_serving: 'Carbohidratos/porción (g)',
    cost_total: 'Costo total',
    cost_serving: 'Costo/porción',

    create_title: 'Nueva receta',
    create_subtitle: 'Armá una receta con ingredientes estructurados y nutrición escalable.',
    basic_info: 'Información básica',
    photo_url: 'URL de foto',
    title: 'Título',
    recipe_title_placeholder: 'ej. Pasta al limón',
    description: 'Descripción',
    category: 'Categoría',
    difficulty: 'Dificultad',
    prep_minutes: 'Preparación (min)',
    search_ingredient: 'Buscar ingrediente',
    quantity: 'Cantidad',
    equivalent_grams: 'Gramos equivalentes',
    unit: 'Unidad',
    add_ingredient: 'Agregar ingrediente',
    no_matches: 'No se encontraron ingredientes.',
    no_ingredients: 'Todavía no hay ingredientes agregados.',
    ingredient_count: '{{count}} ingredientes',
    grams_total: '{{grams}} g total',
    add_step: 'Agregar paso',
    save_recipe: 'Guardar receta',
    type_2_chars: 'Escribí al menos 2 caracteres',
    select_or_type_ingredient: 'Seleccioná o escribí un ingrediente',
    quantity_gt_zero: 'La cantidad debe ser mayor a 0',
    title_required: 'El título es obligatorio',
    recipe_saved: 'Receta guardada',
    save_recipe_failed: 'No se pudo guardar la receta',
    short_summary: 'Resumen corto y claro',
    category_placeholder: 'Cena',
    describe_step: 'Describí este paso',
    step_label: 'Paso {{number}}',

    search_recipes_placeholder: 'Buscar recetas',

    difficulty_easy: 'fácil',
    difficulty_medium: 'media',
    difficulty_hard: 'difícil',

    unit_g: 'g',
    unit_kg: 'kg',
    unit_ml: 'ml',
    unit_l: 'L',
    unit_tsp: 'cdta',
    unit_tbsp: 'cda',
    unit_cup: 'taza',
    unit_unit: 'unidad',

    source_catalog: 'Catálogo',
    source_usda: 'USDA',
  },
  en: {
    tab_home: 'Home',
    tab_create: 'Recipes',
    tab_profile: 'Profile',
    edit_recipe_title: 'Edit Recipe',

    home_title: 'Recipes',
    home_subtitle: 'Cook smarter with your ingredient costs.',
    offline_mode: 'Offline mode: showing cached data',
    no_recipes: 'No recipes found',
    try_search_or_category: 'Try changing search terms or category.',
    all_category: 'All',
    load_recipes_failed: 'Could not load recipes',

    login_kicker: 'Chef PWA',
    login_title: 'Welcome back',
    login_subtitle: 'Sign in to continue managing your recipes.',
    email: 'Email',
    password: 'Password',
    sign_in: 'Sign In',
    create_account: 'Create account',
    email_password_required: 'Email and password are required',
    welcome_back: 'Welcome back',
    failed_login: 'Failed to login',

    register_title: 'Create account',
    register_subtitle: 'Set up your profile to sync recipes across devices.',
    confirm_password: 'Confirm password',
    already_have_account: 'Already have an account?',
    create_account_button: 'Create account',
    passwords_not_match: 'Passwords do not match',
    account_created: 'Account created',
    failed_register: 'Failed to register',

    profile_kicker: 'Account',
    profile_title: 'Profile',
    profile_subtitle: 'Account and session',
    user_id: 'User ID',
    unknown: 'Unknown',
    logout: 'Log Out',
    failed_logout: 'Could not logout',
    settings_title: 'Settings',
    language_title: 'Language',
    language_subtitle: 'Choose the app language',
    language_es: 'Spanish',
    language_en: 'English',

    detail_not_found: 'Recipe not found',
    detail_no_description: 'No description available.',
    minutes_suffix: 'min',
    servings: 'Servings',
    ingredients: 'Ingredients',
    steps: 'Steps',
    calories_total: 'Calories total',
    calories_serving: 'Calories/serving',
    protein_total: 'Protein total (g)',
    protein_serving: 'Protein/serving (g)',
    fat_total: 'Fat total (g)',
    fat_serving: 'Fat/serving (g)',
    carbs_total: 'Carbs total (g)',
    carbs_serving: 'Carbs/serving (g)',
    cost_total: 'Cost total',
    cost_serving: 'Cost/serving',

    create_title: 'New Recipe',
    create_subtitle: 'Build a recipe with structured ingredients and accurate nutrition scaling.',
    basic_info: 'Basic Info',
    photo_url: 'Photo URL',
    title: 'Title',
    recipe_title_placeholder: 'e.g. Lemon Pasta',
    description: 'Description',
    category: 'Category',
    difficulty: 'Difficulty',
    prep_minutes: 'Prep (min)',
    search_ingredient: 'Search ingredient',
    quantity: 'Quantity',
    equivalent_grams: 'Equivalent grams',
    unit: 'Unit',
    add_ingredient: 'Add Ingredient',
    no_matches: 'No ingredient matches found.',
    no_ingredients: 'No ingredients added yet.',
    ingredient_count: '{{count}} ingredients',
    grams_total: '{{grams}} g total',
    add_step: 'Add step',
    save_recipe: 'Save Recipe',
    type_2_chars: 'Type at least 2 characters',
    select_or_type_ingredient: 'Select or type an ingredient',
    quantity_gt_zero: 'Quantity must be greater than 0',
    title_required: 'Title is required',
    recipe_saved: 'Recipe saved',
    save_recipe_failed: 'Could not save recipe',
    short_summary: 'Short, clear summary',
    category_placeholder: 'Dinner',
    describe_step: 'Describe this step',
    step_label: 'Step {{number}}',

    search_recipes_placeholder: 'Search recipes',

    difficulty_easy: 'easy',
    difficulty_medium: 'medium',
    difficulty_hard: 'hard',

    unit_g: 'g',
    unit_kg: 'kg',
    unit_ml: 'ml',
    unit_l: 'L',
    unit_tsp: 'tsp',
    unit_tbsp: 'tbsp',
    unit_cup: 'cup',
    unit_unit: 'unit',

    source_catalog: 'Catalog',
    source_usda: 'USDA',
  },
} as const;

export type TranslationKey = keyof typeof translations.es;

function interpolate(template: string, params?: TranslationParams) {
  if (!params) return template;
  return Object.entries(params).reduce((acc, [key, value]) => acc.replaceAll(`{{${key}}}`, String(value)), template);
}

export function translate(language: AppLanguage, key: TranslationKey, params?: TranslationParams) {
  const value = translations[language][key] ?? translations.es[key] ?? key;
  return interpolate(value, params);
}

export function useI18n() {
  const language: AppLanguage = 'es';

  return {
    language,
    t: (key: TranslationKey, params?: TranslationParams) => translate(language, key, params),
  };
}

export function getDifficultyLabel(value: string, language: AppLanguage) {
  const normalized = value.toLowerCase();
  if (normalized === 'easy' || normalized === 'facil' || normalized === 'fácil') {
    return translate(language, 'difficulty_easy');
  }
  if (normalized === 'hard' || normalized === 'dificil' || normalized === 'difícil') {
    return translate(language, 'difficulty_hard');
  }
  return translate(language, 'difficulty_medium');
}

export function getUnitLabel(unit: string, language: AppLanguage) {
  const keyByUnit: Record<string, TranslationKey> = {
    g: 'unit_g',
    kg: 'unit_kg',
    ml: 'unit_ml',
    l: 'unit_l',
    tsp: 'unit_tsp',
    tbsp: 'unit_tbsp',
    cup: 'unit_cup',
    unit: 'unit_unit',
  };

  const key = keyByUnit[unit] ?? 'unit_unit';
  return translate(language, key);
}
