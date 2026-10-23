import { verifyImageCaptchaLogin } from "@/app/lib/image-captcha";

export async function POST(req: Request): Promise<Response> {
  return verifyImageCaptchaLogin(req);
}
