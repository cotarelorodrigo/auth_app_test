import { createImageCaptcha } from "@/app/lib/image-captcha";

export function GET(): Response {
  return createImageCaptcha();
}
