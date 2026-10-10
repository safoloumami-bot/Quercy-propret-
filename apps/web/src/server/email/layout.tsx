import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type * as React from "react";

/**
 * Gabarit commun des emails. Les couleurs sont écrites ici en dur volontairement :
 * les clients mail ne comprennent pas les variables CSS du design system.
 */
const colors = {
  brand: "#0F6E5E",
  ink: "#10221F",
  muted: "#5B6B68",
  line: "#E3EAE8",
  bg: "#F4F7F6",
};

export function EmailLayout({
  preview,
  title,
  children,
  action,
  footer,
}: {
  preview: string;
  title: string;
  children: React.ReactNode;
  action?: { label: string; href: string };
  footer?: string;
}) {
  return (
    <Html lang="fr">
      <Head />
      <Preview>{preview}</Preview>
      <Body
        style={{
          backgroundColor: colors.bg,
          fontFamily: "Helvetica, Arial, sans-serif",
          margin: 0,
        }}
      >
        <Container style={{ maxWidth: 520, margin: "32px auto", padding: "0 16px" }}>
          <Section
            style={{
              backgroundColor: "#FFFFFF",
              border: `1px solid ${colors.line}`,
              borderRadius: 12,
              padding: "32px 32px 28px",
            }}
          >
            <Text
              style={{ color: colors.brand, fontSize: 15, fontWeight: 700, margin: "0 0 24px" }}
            >
              Quercy
            </Text>
            <Heading as="h1" style={{ color: colors.ink, fontSize: 20, margin: "0 0 12px" }}>
              {title}
            </Heading>
            <Section style={{ color: colors.ink, fontSize: 15, lineHeight: "24px" }}>
              {children}
            </Section>
            {action ? (
              <Section style={{ margin: "24px 0 8px" }}>
                <Button
                  href={action.href}
                  style={{
                    backgroundColor: colors.brand,
                    borderRadius: 8,
                    color: "#FFFFFF",
                    fontSize: 15,
                    fontWeight: 600,
                    padding: "12px 20px",
                  }}
                >
                  {action.label}
                </Button>
              </Section>
            ) : null}
            <Hr style={{ borderColor: colors.line, margin: "24px 0 16px" }} />
            <Text style={{ color: colors.muted, fontSize: 13, lineHeight: "20px", margin: 0 }}>
              {footer ??
                "Vous recevez cet email parce qu'une action a été demandée sur Quercy. Si ce n'est pas vous, ignorez-le simplement."}
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
