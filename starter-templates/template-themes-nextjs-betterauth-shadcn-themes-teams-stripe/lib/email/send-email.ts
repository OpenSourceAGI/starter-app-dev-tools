export interface EmailServiceBinding {
  send: (message: {
    from: string;
    to: string | string[];
    subject: string;
    text?: string;
    html?: string;
  }) => Promise<{ id: string }>;
}

export async function sendEmail(
  binding: EmailServiceBinding | null,
  {
    from,
    to,
    subject,
    html,
    text,
  }: {
    from: string;
    to: string;
    subject: string;
    html?: string;
    text?: string;
  }
) {
  if (!binding) {
    console.warn(
      `Email not configured. Would send to ${to}:\nSubject: ${subject}`
    );
    return { success: true, id: "local-dev" };
  }

  try {
    const result = await binding.send({
      from,
      to,
      subject,
      html,
      text,
    });
    return { success: true, id: result.id };
  } catch (error) {
    console.error("Failed to send email:", error);
    throw error;
  }
}
