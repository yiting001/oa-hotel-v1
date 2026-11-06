/**
 * 食材品类与品名基础数据：拼音首字母用于下拉快捷检索，
 * 下拉只作为输入建议，用户仍可直接手填任意品类/品名。
 */

export interface FoodCatalogOption {
  name: string;
  /** 拼音首字母，例如「五花肉」→ wr。 */
  initials: string;
}

export interface FoodItemOption extends FoodCatalogOption {
  category: string;
}

export const FOOD_CATEGORIES: readonly FoodCatalogOption[] = [
  { name: '蔬菜类', initials: 'scl' },
  { name: '肉禽类', initials: 'rql' },
  { name: '水产类', initials: 'scl' },
  { name: '粮油类', initials: 'lyl' },
  { name: '调味料', initials: 'dwl' },
  { name: '蛋奶类', initials: 'dnl' },
  { name: '干货类', initials: 'ghl' },
  { name: '水果类', initials: 'sgl' },
  { name: '酒水饮料', initials: 'jsyl' },
  { name: '冷冻食品', initials: 'ldsp' },
];

export const FOOD_ITEMS: readonly FoodItemOption[] = [
  // 蔬菜类
  { name: '土豆', initials: 'td', category: '蔬菜类' },
  { name: '白菜', initials: 'bc', category: '蔬菜类' },
  { name: '青菜', initials: 'qc', category: '蔬菜类' },
  { name: '西红柿', initials: 'xhs', category: '蔬菜类' },
  { name: '黄瓜', initials: 'hg', category: '蔬菜类' },
  { name: '大葱', initials: 'dc', category: '蔬菜类' },
  { name: '小葱', initials: 'xc', category: '蔬菜类' },
  { name: '生姜', initials: 'sj', category: '蔬菜类' },
  { name: '大蒜', initials: 'ds', category: '蔬菜类' },
  { name: '洋葱', initials: 'yc', category: '蔬菜类' },
  { name: '胡萝卜', initials: 'hlb', category: '蔬菜类' },
  { name: '白萝卜', initials: 'blb', category: '蔬菜类' },
  { name: '茄子', initials: 'qz', category: '蔬菜类' },
  { name: '青椒', initials: 'qj', category: '蔬菜类' },
  { name: '尖椒', initials: 'jj', category: '蔬菜类' },
  { name: '豆角', initials: 'dj', category: '蔬菜类' },
  { name: '芹菜', initials: 'qc', category: '蔬菜类' },
  { name: '菠菜', initials: 'bc', category: '蔬菜类' },
  { name: '生菜', initials: 'sc', category: '蔬菜类' },
  { name: '油麦菜', initials: 'ymc', category: '蔬菜类' },
  { name: '冬瓜', initials: 'dg', category: '蔬菜类' },
  { name: '南瓜', initials: 'ng', category: '蔬菜类' },
  { name: '丝瓜', initials: 'sg', category: '蔬菜类' },
  { name: '苦瓜', initials: 'kg', category: '蔬菜类' },
  { name: '莲藕', initials: 'lo', category: '蔬菜类' },
  { name: '山药', initials: 'sy', category: '蔬菜类' },
  { name: '豆芽', initials: 'dy', category: '蔬菜类' },
  { name: '豆腐', initials: 'df', category: '蔬菜类' },
  // 肉禽类
  { name: '五花肉', initials: 'wr', category: '肉禽类' },
  { name: '猪肉', initials: 'zr', category: '肉禽类' },
  { name: '牛肉', initials: 'nr', category: '肉禽类' },
  { name: '羊肉', initials: 'yr', category: '肉禽类' },
  { name: '牛腩', initials: 'nn', category: '肉禽类' },
  { name: '排骨', initials: 'pg', category: '肉禽类' },
  { name: '猪蹄', initials: 'zt', category: '肉禽类' },
  { name: '鸡腿', initials: 'jt', category: '肉禽类' },
  { name: '鸡胸肉', initials: 'jxr', category: '肉禽类' },
  { name: '鸡翅', initials: 'jc', category: '肉禽类' },
  { name: '鸭腿', initials: 'yt', category: '肉禽类' },
  // 水产类
  { name: '草鱼', initials: 'cy', category: '水产类' },
  { name: '鲤鱼', initials: 'ly', category: '水产类' },
  { name: '带鱼', initials: 'dy', category: '水产类' },
  { name: '鲈鱼', initials: 'ly', category: '水产类' },
  { name: '虾仁', initials: 'xr', category: '水产类' },
  { name: '基围虾', initials: 'jwx', category: '水产类' },
  { name: '螃蟹', initials: 'px', category: '水产类' },
  { name: '鱿鱼', initials: 'yy', category: '水产类' },
  { name: '花甲', initials: 'hj', category: '水产类' },
  // 粮油类
  { name: '大米', initials: 'dm', category: '粮油类' },
  { name: '糯米', initials: 'nm', category: '粮油类' },
  { name: '小米', initials: 'xm', category: '粮油类' },
  { name: '面粉', initials: 'mf', category: '粮油类' },
  { name: '挂面', initials: 'gm', category: '粮油类' },
  { name: '食用油', initials: 'syy', category: '粮油类' },
  { name: '花生油', initials: 'hsy', category: '粮油类' },
  { name: '菜籽油', initials: 'czy', category: '粮油类' },
  { name: '淀粉', initials: 'df', category: '粮油类' },
  // 调味料
  { name: '酱油', initials: 'jy', category: '调味料' },
  { name: '生抽', initials: 'sc', category: '调味料' },
  { name: '老抽', initials: 'lc', category: '调味料' },
  { name: '醋', initials: 'c', category: '调味料' },
  { name: '食盐', initials: 'sy', category: '调味料' },
  { name: '白糖', initials: 'bt', category: '调味料' },
  { name: '红糖', initials: 'ht', category: '调味料' },
  { name: '鸡精', initials: 'jj', category: '调味料' },
  { name: '味精', initials: 'wz', category: '调味料' },
  { name: '蚝油', initials: 'hy', category: '调味料' },
  { name: '料酒', initials: 'lj', category: '调味料' },
  { name: '花椒', initials: 'hj', category: '调味料' },
  { name: '八角', initials: 'bj', category: '调味料' },
  { name: '桂皮', initials: 'gp', category: '调味料' },
  { name: '香叶', initials: 'xy', category: '调味料' },
  { name: '辣椒酱', initials: 'ljj', category: '调味料' },
  { name: '番茄酱', initials: 'fqj', category: '调味料' },
  // 蛋奶类
  { name: '鸡蛋', initials: 'jd', category: '蛋奶类' },
  { name: '鸭蛋', initials: 'yd', category: '蛋奶类' },
  { name: '鹌鹑蛋', initials: 'acd', category: '蛋奶类' },
  { name: '牛奶', initials: 'nn', category: '蛋奶类' },
  { name: '酸奶', initials: 'sn', category: '蛋奶类' },
  { name: '奶油', initials: 'ny', category: '蛋奶类' },
  { name: '芝士', initials: 'zs', category: '蛋奶类' },
  // 干货类
  { name: '木耳', initials: 'me', category: '干货类' },
  { name: '香菇', initials: 'xg', category: '干货类' },
  { name: '银耳', initials: 'ye', category: '干货类' },
  { name: '红枣', initials: 'hz', category: '干货类' },
  { name: '枸杞', initials: 'gq', category: '干货类' },
  { name: '花生米', initials: 'hsm', category: '干货类' },
  { name: '黄豆', initials: 'hd', category: '干货类' },
  { name: '绿豆', initials: 'ld', category: '干货类' },
  { name: '紫菜', initials: 'zc', category: '干货类' },
  { name: '海带', initials: 'hd', category: '干货类' },
  { name: '粉丝', initials: 'fs', category: '干货类' },
  // 水果类
  { name: '苹果', initials: 'pg', category: '水果类' },
  { name: '香蕉', initials: 'xj', category: '水果类' },
  { name: '橙子', initials: 'cz', category: '水果类' },
  { name: '西瓜', initials: 'xg', category: '水果类' },
  { name: '梨', initials: 'l', category: '水果类' },
  { name: '葡萄', initials: 'pt', category: '水果类' },
  { name: '哈密瓜', initials: 'hmg', category: '水果类' },
  { name: '圣女果', initials: 'sng', category: '水果类' },
  // 酒水饮料
  { name: '可乐', initials: 'kl', category: '酒水饮料' },
  { name: '雪碧', initials: 'xb', category: '酒水饮料' },
  { name: '矿泉水', initials: 'kqs', category: '酒水饮料' },
  { name: '啤酒', initials: 'pj', category: '酒水饮料' },
  { name: '果汁', initials: 'gz', category: '酒水饮料' },
  { name: '红茶', initials: 'hc', category: '酒水饮料' },
  { name: '绿茶', initials: 'lc', category: '酒水饮料' },
  // 冷冻食品
  { name: '速冻水饺', initials: 'sdsj', category: '冷冻食品' },
  { name: '汤圆', initials: 'ty', category: '冷冻食品' },
  { name: '鸡米花', initials: 'jmh', category: '冷冻食品' },
  { name: '薯条', initials: 'st', category: '冷冻食品' },
  { name: '鱼丸', initials: 'yw', category: '冷冻食品' },
  { name: '牛肉丸', initials: 'nwr', category: '冷冻食品' },
];

/** 选定品类后只推荐该品类的品名；手填品类时返回全部品名。 */
export function foodItemsForCategory(category: string): readonly FoodItemOption[] {
  const normalized = category.trim();
  if (!normalized) return FOOD_ITEMS;
  const categoryNames = new Set(FOOD_CATEGORIES.map((entry) => entry.name));
  if (!categoryNames.has(normalized)) return FOOD_ITEMS;
  return FOOD_ITEMS.filter((item) => item.category === normalized);
}
