// Cấu hình công khai. Publishable key của Supabase được phép đặt ở trình duyệt (bảo mật bởi RLS trong supabase/schema.sql).
// TUYỆT ĐỐI KHÔNG dán "secret key" / "service_role" vào đây.
window.AIC_CONFIG = {
  SUPABASE_URL: 'https://nbpcnzlwtkscribjvwml.supabase.co',
  SUPABASE_KEY: 'sb_publishable_MyPIS5R71FLH_R0KazZBOg_nvkDsY8w',
  EMAIL_DOMAIN: 'aiclassroom.app',          // email ảo tạo từ tên người dùng (không gửi mail thật)
  GEMINI_BASE: 'https://generativelanguage.googleapis.com/v1beta',
  DEFAULT_MODEL: 'models/gemini-2.5-flash'
};
