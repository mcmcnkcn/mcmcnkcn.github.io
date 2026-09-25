export const games = [
  {id:'mochi',path:'/games/mcmcnkcn/',name:'ﾓﾁﾓﾁﾈｺﾁｬﾝ',lead:'盆栽を育てていたはずなのに!?',description:'3枚のカードから1枚を選んで、盆栽のお世話。 ところが庭にヘンなねこがあらわれて……。',extra:'水をあげたり、枝を切ったり。 今日のひと手間で、庭の様子が変わっていきます。',facts:['盆栽育成カードゲーム','ブラウザゲーム','無料'],url:'https://mcmcnkcn.github.io/games/mcmcnkcn/play/',cta:'ﾓﾁﾓﾁﾈｺﾁｬﾝで遊ぶ',cat:'mochi-cat.png'},
  {id:'nyan',path:'/games/nyan-sort/',name:'にゃんそーと',lead:'注いでそろえる 猫のパズル',description:'猫の液体をボトルからボトルへ。 同じ色でいっぱいにしよう！',extra:'いつもの色分けに加えて、曜日で変わるデイリーパズルも。 いろんなボトルとねこたちが待っています。',facts:['色分けパズル','デイリーパズル','無料'],url:'https://nyan-sort.ver1000000.com/',cta:'にゃんそーとで遊ぶ',cat:'nyan-cat.png'},
  {id:'tower',name:'キャットタワーはどこまでも',preview:true},
  {id:'future',name:'次のゲーム',preview:true}
];

export const site = {name:'Mico mico nekochan games',origin:'https://mcmcnkcn.github.io',description:'ねこのゲーム制作サークル「Mico mico nekochan games」の公式サイトです。'};
export function pageMeta(game){
  return {title:game ? `${game.name} | ${site.name}` : site.name,description:game?.description||site.description,url:site.origin+(game?.path||'/'),image:site.origin+`/assets/og-${game?.id||'site'}.png`};
}
