import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase/client";

export interface FeedbackSendInput {
  name: string;
  comment: string;
}
export interface FeedbackSendOutput {
  sent: boolean;
}

export async function feedbackSend(
  input: FeedbackSendInput
): Promise<FeedbackSendOutput> {
  const call = httpsCallable<FeedbackSendInput, FeedbackSendOutput>(functions, "feedbackSend");
  const res = await call(input);
  return res.data;
}