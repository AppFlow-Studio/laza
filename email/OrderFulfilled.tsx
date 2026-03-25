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

interface OrderFulfilledProps {
    storeName: string;
    ticketId: string;
    fulfillmentType: "full" | "partial";
    itemCount: number;
    totalBoxes: number;
    deliveryType: "company" | "self";
    remainderTicketId?: string;
    items: {
        name: string;
        requestedBoxes: number;
        fulfilledBoxes: number;
    }[];
    dashboardUrl: string;
    remainderUrl?: string;
    fulfilledAt: string;
}

export function OrderFulfilled({
    storeName,
    ticketId,
    fulfillmentType,
    itemCount,
    totalBoxes,
    deliveryType,
    remainderTicketId,
    items,
    dashboardUrl,
    remainderUrl,
    fulfilledAt,
}: OrderFulfilledProps) {
    const shortId      = ticketId.slice(-8).toUpperCase();
    const isPartial    = fulfillmentType === "partial";
    const previewText  = isPartial
        ? `Your order #${shortId} was partially fulfilled — a remainder ticket has been created`
        : `Your order #${shortId} has been fulfilled and is on its way`;

    return (
        <Html>
            <Head />
            <Preview>{previewText}</Preview>
            <Tailwind>
                <Body className="bg-gray-50 font-sans">
                    <Container className="mx-auto max-w-[600px] py-8">

                        {/* Header */}
                        <Section
                            className={`rounded-t-xl px-8 py-6 ${
                                isPartial ? "bg-amber-500" : "bg-violet-600"
                            }`}
                        >
                            <Heading className="text-white text-xl font-bold m-0">
                                {isPartial ? "Order Partially Fulfilled" : "Order Fulfilled"}
                            </Heading>
                            <Text className={`text-sm mt-1 mb-0 ${isPartial ? "text-amber-100" : "text-violet-200"}`}>
                                Order #{shortId} · {fulfilledAt}
                            </Text>
                        </Section>

                        {/* Body */}
                        <Section className="bg-white px-8 py-6">
                            {isPartial ? (
                                <>
                                    <Text className="text-gray-700 text-base mt-0">
                                        Hi <strong>{storeName}</strong>, your order has been{" "}
                                        <strong>partially fulfilled</strong>. Some items were unavailable
                                        in the warehouse — a remainder ticket has been created automatically
                                        for the shortfall.
                                    </Text>
                                    {remainderTicketId && (
                                        <Section className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-5">
                                            <Text className="text-xs font-semibold text-amber-700 uppercase tracking-widest m-0">
                                                Remainder ticket created
                                            </Text>
                                            <Text className="text-sm text-amber-800 mt-1 mb-2">
                                                The unfulfilled items have been resubmitted as a new order
                                                (#{remainderTicketId.slice(-8).toUpperCase()}) and will be
                                                fulfilled when stock is replenished.
                                            </Text>
                                            {remainderUrl && (
                                                <Button
                                                    href={remainderUrl}
                                                    className="bg-amber-500 text-white text-xs font-semibold px-4 py-2 rounded-lg no-underline"
                                                >
                                                    View Remainder Ticket →
                                                </Button>
                                            )}
                                        </Section>
                                    )}
                                </>
                            ) : (
                                <Text className="text-gray-700 text-base mt-0">
                                    Great news, <strong>{storeName}</strong>! Your order has been{" "}
                                    <strong>fully fulfilled</strong> and{" "}
                                    {deliveryType === "self"
                                        ? "is ready for pickup at the warehouse."
                                        : "is on its way to your store."}
                                </Text>
                            )}

                            {/* Delivery info */}
                            <Section className="bg-gray-50 rounded-lg px-5 py-4 mb-5">
                                <Row>
                                    <Column>
                                        <Text className="text-xs font-semibold text-gray-400 uppercase tracking-widest m-0">
                                            Delivery method
                                        </Text>
                                        <Text className="text-sm font-semibold text-gray-900 mt-1 mb-0">
                                            {deliveryType === "self" ? "Self-pickup" : "Company delivery"}
                                        </Text>
                                        {deliveryType === "self" && (
                                            <Text className="text-xs text-gray-500 mt-0.5 mb-0">
                                                Please collect from the warehouse
                                            </Text>
                                        )}
                                    </Column>
                                    <Column>
                                        <Text className="text-xs font-semibold text-gray-400 uppercase tracking-widest m-0">
                                            Items sent
                                        </Text>
                                        <Text className="text-sm font-semibold text-gray-900 mt-1 mb-0">
                                            {itemCount} items · {totalBoxes} boxes
                                        </Text>
                                    </Column>
                                </Row>
                            </Section>

                            {/* Items breakdown */}
                            <Text className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
                                Fulfillment breakdown
                            </Text>
                            <Section className="border border-gray-200 rounded-lg overflow-hidden mb-5">
                                <Row className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                                    <Column className="w-1/2">
                                        <Text className="text-xs font-semibold text-gray-500 m-0">Item</Text>
                                    </Column>
                                    <Column className="w-1/4 text-center">
                                        <Text className="text-xs font-semibold text-gray-500 m-0">Ordered</Text>
                                    </Column>
                                    <Column className="w-1/4 text-center">
                                        <Text className="text-xs font-semibold text-gray-500 m-0">Sent</Text>
                                    </Column>
                                </Row>
                                {items.map((item, i) => {
                                    const isFull    = item.fulfilledBoxes >= item.requestedBoxes;
                                    const isNone    = item.fulfilledBoxes === 0;
                                    const sentColor = isFull
                                        ? "text-green-600 font-semibold"
                                        : isNone
                                          ? "text-red-500"
                                          : "text-amber-600 font-semibold";

                                    return (
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
                                                <Text className="text-sm text-gray-500 m-0">
                                                    {item.requestedBoxes}
                                                </Text>
                                            </Column>
                                            <Column className="w-1/4 text-center">
                                                <Text className={`text-sm m-0 ${sentColor}`}>
                                                    {item.fulfilledBoxes}
                                                    {!isFull && !isNone && " *"}
                                                </Text>
                                            </Column>
                                        </Row>
                                    );
                                })}
                            </Section>

                            {/* Next step instruction */}
                            <Section className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-5">
                                <Text className="text-xs font-semibold text-blue-700 uppercase tracking-widest m-0">
                                    Next step
                                </Text>
                                <Text className="text-sm text-blue-800 mt-1 mb-0">
                                    When your delivery arrives, open the app and confirm receipt.
                                    Count each item and enter the actual boxes received. This updates
                                    your store inventory automatically.
                                </Text>
                            </Section>

                            {/* CTA */}
                            <Section className="text-center mt-6">
                                <Button
                                    href={dashboardUrl}
                                    className="bg-indigo-600 text-white text-sm font-semibold px-6 py-3 rounded-lg no-underline"
                                >
                                    View Order Details →
                                </Button>
                            </Section>
                        </Section>

                        <Hr className="border-gray-200 my-0" />

                        <Section className="bg-white rounded-b-xl px-8 py-4">
                            <Text className="text-xs text-gray-400 text-center m-0">
                                Laza Dessert Cafe · Warehouse Management System
                            </Text>
                            <Text className="text-xs text-gray-400 text-center mt-1 mb-0">
                                You're receiving this because you manage {storeName}.
                            </Text>
                        </Section>

                    </Container>
                </Body>
            </Tailwind>
        </Html>
    );
}

export default OrderFulfilled;