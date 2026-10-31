import {
    Body,
    Button,
    Container,
    Head,
    Heading,
    Hr,
    Html,
    Preview,
    Row,
    Column,
    Section,
    Text,
    Tailwind,
} from "@react-email/components";

interface OrderConfirmedProps {
    storeName: string;
    ticketId: string;
    confirmedAt: string;
    hasDiscrepancy: boolean;
    itemCount: number;
    totalBoxes: number;
    dashboardUrl: string;
}

export function OrderConfirmed({
    storeName,
    ticketId,
    confirmedAt,
    hasDiscrepancy,
    itemCount,
    totalBoxes,
    dashboardUrl,
}: OrderConfirmedProps) {
    const shortId     = ticketId.slice(-8).toUpperCase();
    const previewText = `Receipt confirmed for #${shortId} ${hasDiscrepancy ? "with discrepancies" : ""}`;

    return (
        <Html>
            <Head />
            <Preview>{previewText}</Preview>
            <Tailwind>
                <Body className="bg-gray-50 font-sans">
                    <Container className="mx-auto max-w-[600px] py-8">

                        {/* Header */}
                        <Section className={hasDiscrepancy ? "bg-amber-600 rounded-t-xl px-8 py-6" : "bg-green-600 rounded-t-xl px-8 py-6"}>
                            <Heading className="text-white text-xl font-bold m-0">
                                Receipt Confirmed
                            </Heading>
                            <Text className="text-white/80 text-sm mt-1 mb-0">
                                Order #{shortId} · {confirmedAt}
                            </Text>
                        </Section>

                        {/* Body */}
                        <Section className="bg-white px-8 py-6">
                            <Text className="text-gray-700 text-base mt-0">
                                <strong>{storeName}</strong> has confirmed receipt of their order.
                            </Text>

                            {hasDiscrepancy && (
                                <Section className="bg-amber-50 border border-amber-200 rounded-lg px-5 py-4 mb-5">
                                    <Text className="text-xs font-semibold text-amber-700 uppercase tracking-widest m-0">
                                        Attention Required
                                    </Text>
                                    <Text className="text-sm text-amber-900 mt-2 mb-0 leading-relaxed">
                                        This order was confirmed with <strong>discrepancies</strong>. 
                                        Please review the details in the dashboard.
                                    </Text>
                                </Section>
                            )}

                            {/* Summary */}
                            <Section className="bg-gray-50 rounded-lg px-5 py-4 mb-5">
                                <Row>
                                    <Column>
                                        <Text className="text-xs text-gray-500 m-0 text-center">Items</Text>
                                        <Text className="text-sm font-semibold text-gray-900 mt-0.5 mb-0 text-center">
                                            {itemCount}
                                        </Text>
                                    </Column>
                                    <Column>
                                        <Text className="text-xs text-gray-500 m-0 text-center">Total boxes</Text>
                                        <Text className="text-sm font-semibold text-gray-900 mt-0.5 mb-0 text-center">
                                            {totalBoxes}
                                        </Text>
                                    </Column>
                                </Row>
                            </Section>

                            {/* CTAs */}
                            <Section className="text-center">
                                <Button
                                    href={dashboardUrl}
                                    className="bg-indigo-600 text-white text-sm font-semibold px-6 py-3 rounded-lg no-underline"
                                >
                                    View Receipt Details →
                                </Button>
                            </Section>
                        </Section>

                        <Hr className="border-gray-200 my-0" />

                        <Section className="bg-white rounded-b-xl px-8 py-4">
                            <Text className="text-xs text-gray-400 text-center m-0">
                                Laza Dessert Cafe · Warehouse Management System
                            </Text>
                        </Section>

                    </Container>
                </Body>
            </Tailwind>
        </Html>
    );
}

export default OrderConfirmed;
