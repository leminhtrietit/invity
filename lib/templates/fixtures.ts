import { vowEditorialFixture } from "../invitation/fixtures.ts";
import { invitationContentSchema,type InvitationContent } from "../invitation/schema.ts";

const previews:Record<string,Partial<InvitationContent>>={
  "vow-editorial":{},
  "silk-promise":{title:"Lễ đính hôn của Gia Hân & Đức Minh",hosts:[{name:"Gia Hân",role:"Cô dâu"},{name:"Đức Minh",role:"Chú rể"}],prelude:"Hai gia đình trân trọng báo tin lễ đính hôn của hai con.",story:{eyebrow:"Lời thưa cùng gia đình",heading:"Một lời hẹn, hai gia đình cùng chung niềm vui.",body:"Ngày hôm nay đánh dấu lời hứa trang trọng trước gia đình và những người thân yêu."}},
  "garden-vow":{title:"Garden wedding · Mai & Nam",hosts:[{name:"Mai",role:"Bride"},{name:"Nam",role:"Groom"}],venue:{name:"Vườn Thảo Điền",address:"32 đường số 10, Thảo Điền, TP. Hồ Chí Minh",mapUrl:"https://maps.google.com/?q=Thao+Dien+Ho+Chi+Minh"}},
  "midnight-toast":{title:"An evening to remember",hosts:[{name:"Minh",role:"Host"}],prelude:"Cocktail, âm nhạc và những cuộc trò chuyện dưới ánh đèn thành phố.",sections:{...vowEditorialFixture.sections,story:false,countdown:false},story:undefined},
  "little-orbit":{title:"Bé Bông tròn một tuổi",hosts:[{name:"Bông",role:"Nhân vật chính"}],prelude:"Mời cô chú đến chung vui trong chuyến du hành đầu tiên quanh mặt trời.",sections:{...vowEditorialFixture.sections,story:false,gift:false},story:undefined,gift:{enabled:false,message:""}},
  "confetti-club":{title:"Linh turns twenty two!",hosts:[{name:"Linh",role:"Birthday girl"}],prelude:"Dress bright, bring your best dance moves and celebrate all night.",sections:{...vowEditorialFixture.sections,story:false,wishes:false},story:undefined,wishes:{enabled:false,samples:[]}},
  "new-chapter":{title:"Lễ tốt nghiệp của Hoàng Long",hosts:[{name:"Hoàng Long",role:"Class of 2026"}],prelude:"Một chương khép lại. Một hành trình mới bắt đầu.",venue:{name:"Đại học Quốc gia",address:"Khu đô thị Đại học Quốc gia, TP. Thủ Đức",mapUrl:"https://maps.google.com/?q=Vietnam+National+University+HCMC"}},
  "linen-table":{title:"Mừng ngôi nhà mới của gia đình An",hosts:[{name:"Nhà An",role:"Gia chủ"}],prelude:"Một bữa cơm ấm, vài câu chuyện vui và những người chúng tôi thương quý.",sections:{...vowEditorialFixture.sections,countdown:false,story:false},story:undefined},
  "afterglow":{title:"The Promise · Thu & Khang",hosts:[{name:"Thu",role:"Bride to be"},{name:"Khang",role:"Groom to be"}],prelude:"Giữa ánh hoàng hôn, chúng mình chọn nói lời đồng ý.",schedule:[{time:"16:30",title:"Đón khách"},{time:"17:15",title:"Lễ đính hôn"},{time:"18:00",title:"Sunset dinner"}]},
  "reunion-notes":{title:"Họp lớp 12A1 · Mười năm gặp lại",hosts:[{name:"12A1",role:"Niên khóa 2013–2016"}],prelude:"Trở lại một buổi tối để kể tiếp những câu chuyện còn dang dở.",sections:{...vowEditorialFixture.sections,story:false,gift:false,wishes:false},story:undefined,gift:{enabled:false,message:""},wishes:{enabled:false,samples:[]}},
};

export function getTemplateFixture(templateId:string){return invitationContentSchema.parse({...structuredClone(vowEditorialFixture),...previews[templateId]});}
