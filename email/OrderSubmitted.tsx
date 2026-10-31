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

interface OrderSubmittedProps {
    storeName: string;
    storeAddress?: string;
    submittedByName: string;
    ticketId: string;
    itemCount: number;
    totalBoxes: number;
    deliveryType: "company" | "self";
    notes?: string;
    items: {
        name: string;
        quantityBoxes: number;
        quantityUnits: number;
        unitOfMeasure: string;
    }[];
    dashboardUrl: string;
    submittedAt: string;
}

export function OrderSubmitted({
    storeName,
    storeAddress,
    submittedByName,
    ticketId,
    itemCount,
    totalBoxes,
    deliveryType,
    notes,
    items,
    dashboardUrl,
    submittedAt,
}: OrderSubmittedProps) {
    const shortId = ticketId.slice(-8).toUpperCase();
    const previewText = `${storeName} submitted an order for ${itemCount} item${itemCount !== 1 ? "s" : ""} (${totalBoxes} boxes)`;

    return (
        <Html>
            <Head />
            <Preview>{previewText}</Preview>
            <Tailwind>
                <Body className="bg-gray-50 font-sans">
                    <Container className="mx-auto max-w-[600px] py-8">

                        {/* Header */}
                        <Section className="bg-indigo-600 rounded-t-xl px-8 py-6">
                            <Heading className="text-white text-xl font-bold m-0">
                                New Order Submitted
                            </Heading>
                            <Text className="text-indigo-200 text-sm mt-1 mb-0">
                                Laza Warehouse · Order #{shortId}
                            </Text>
                        </Section>

                        {/* Body */}
                        <Section className="bg-white px-8 py-6">
                            <Text className="text-gray-700 text-base mt-0">
                                <strong>{storeName}</strong> has submitted a new warehouse order
                                that requires your review.
                            </Text>

                            {/* Store info */}
                            <Section className="bg-gray-50 rounded-lg px-5 py-4 mb-5">
                                <Row>
                                    <Column>
                                        <Text className="text-xs font-semibold text-gray-400 uppercase tracking-widest m-0">
                                            Store
                                        </Text>
                                        <Text className="text-sm font-semibold text-gray-900 mt-1 mb-0">
                                            {storeName}
                                        </Text>
                                        {storeAddress && (
                                            <Text className="text-xs text-gray-500 mt-0.5 mb-0">
                                                {storeAddress}
                                            </Text>
                                        )}
                                    </Column>
                                    <Column>
                                        <Text className="text-xs font-semibold text-gray-400 uppercase tracking-widest m-0">
                                            Submitted by
                                        </Text>
                                        <Text className="text-sm font-semibold text-gray-900 mt-1 mb-0">
                                            {submittedByName}
                                        </Text>
                                        <Text className="text-xs text-gray-500 mt-0.5 mb-0">
                                            {submittedAt}
                                        </Text>
                                    </Column>
                                    <Column>
                                        <Text className="text-xs font-semibold text-gray-400 uppercase tracking-widest m-0">
                                            Delivery
                                        </Text>
                                        <Text className="text-sm font-semibold text-gray-900 mt-1 mb-0">
                                            {deliveryType === "self" ? "Self-pickup" : "Company delivery"}
                                        </Text>
                                    </Column>
                                </Row>
                            </Section>

                            {/* Summary stats */}
                            <Section className="mb-5">
                                <Row>
                                    <Column className="text-center bg-indigo-50 rounded-lg px-4 py-3 mr-2">
                                        <Text className="text-2xl font-bold text-indigo-600 m-0">
                                            {itemCount}
                                        </Text>
                                        <Text className="text-xs text-gray-500 mt-0.5 mb-0">
                                            Line items
                                        </Text>
                                    </Column>
                                    <Column className="text-center bg-indigo-50 rounded-lg px-4 py-3">
                                        <Text className="text-2xl font-bold text-indigo-600 m-0">
                                            {totalBoxes}
                                        </Text>
                                        <Text className="text-xs text-gray-500 mt-0.5 mb-0">
                                            Total boxes
                                        </Text>
                                    </Column>
                                </Row>
                            </Section>

                            {/* Items table */}
                            <Text className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
                                Items requested
                            </Text>
                            <Section className="border border-gray-200 rounded-lg overflow-hidden mb-5">
                                {/* Table header */}
                                <Row className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                                    <Column className="w-1/2">
                                        <Text className="text-xs font-semibold text-gray-500 m-0">Item</Text>
                                    </Column>
                                    <Column className="w-1/4 text-center">
                                        <Text className="text-xs font-semibold text-gray-500 m-0">Boxes</Text>
                                    </Column>
                                    <Column className="w-1/4 text-center">
                                        <Text className="text-xs font-semibold text-gray-500 m-0">Units</Text>
                                    </Column>
                                </Row>
                                {items.map((item, i) => (
                                    <Row
                                        key={i}
                                        className={`px-4 py-2.5 ${i < items.length - 1 ? "border-b border-gray-100" : ""}`}
                                    >
                                        <Column className="w-1/2">
                                            <Text className="text-sm font-medium text-gray-800 m-0">
                                                {item.name}
                                            </Text>
                                        </Column>
                                        <Column className="w-1/4 text-center">
                                            <Text className="text-sm text-gray-700 m-0">
                                                {item.quantityBoxes}
                                            </Text>
                                        </Column>
                                        <Column className="w-1/4 text-center">
                                            <Text className="text-sm text-gray-700 m-0">
                                                {item.quantityUnits} {item.unitOfMeasure}
                                            </Text>
                                        </Column>
                                    </Row>
                                ))}
                            </Section>

                            {/* Notes */}
                            {notes && (
                                <Section className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 mb-5">
                                    <Text className="text-xs font-semibold text-yellow-700 uppercase tracking-widest m-0">
                                        Note from store
                                    </Text>
                                    <Text className="text-sm text-yellow-800 mt-1 mb-0 italic">
                                        "{notes}"
                                    </Text>
                                </Section>
                            )}

                            {/* CTA */}
                            <Section className="text-center mt-6">
                                <Button
                                    href={dashboardUrl}
                                    className="bg-indigo-600 text-white text-sm font-semibold px-6 py-3 rounded-lg no-underline"
                                >
                                    Review Order in Dashboard →
                                </Button>
                            </Section>
                        </Section>

                        <Hr className="border-gray-200 my-0" />

                        {/* Footer */}
                        <Section className="bg-white rounded-b-xl px-8 py-4">
                            <Text className="text-xs text-gray-400 text-center m-0">
                                Laza Dessert Cafe · Warehouse Management System
                            </Text>
                            <Text className="text-xs text-gray-400 text-center mt-1 mb-0">
                                You're receiving this because you're a super admin.
                            </Text>
                        </Section>

                    </Container>
                </Body>
            </Tailwind>
        </Html>
    );
}

export default OrderSubmitted;