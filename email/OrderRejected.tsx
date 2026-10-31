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

interface OrderRejectedProps {
    storeName: string;
    ticketId: string;
    rejectionReason: string;
    itemCount: number;
    totalBoxes: number;
    items: {
        name: string;
        quantityBoxes: number;
    }[];
    dashboardUrl: string;
    newOrderUrl: string;
    rejectedAt: string;
}

export function OrderRejected({
    storeName,
    ticketId,
    rejectionReason,
    itemCount,
    totalBoxes,
    items,
    dashboardUrl,
    newOrderUrl,
    rejectedAt,
}: OrderRejectedProps) {
    const shortId     = ticketId.slice(-8).toUpperCase();
    const previewText = `Your order #${shortId} was rejected — ${rejectionReason.slice(0, 80)}`;

    return (
        <Html>
            <Head />
            <Preview>{previewText}</Preview>
            <Tailwind>
                <Body className="bg-gray-50 font-sans">
                    <Container className="mx-auto max-w-[600px] py-8">

                        {/* Header */}
                        <Section className="bg-red-600 rounded-t-xl px-8 py-6">
                            <Heading className="text-white text-xl font-bold m-0">
                                Order Rejected
                            </Heading>
                            <Text className="text-red-200 text-sm mt-1 mb-0">
                                Order #{shortId} · {rejectedAt}
                            </Text>
                        </Section>

                        {/* Body */}
                        <Section className="bg-white px-8 py-6">
                            <Text className="text-gray-700 text-base mt-0">
                                Hi <strong>{storeName}</strong>, unfortunately your warehouse
                                order has been <strong>rejected</strong> by the warehouse team.
                            </Text>

                            {/* Rejection reason — most important part */}
                            <Section className="bg-red-50 border border-red-200 rounded-lg px-5 py-4 mb-5">
                                <Text className="text-xs font-semibold text-red-700 uppercase tracking-widest m-0">
                                    Reason for rejection
                                </Text>
                                <Text className="text-sm text-red-900 mt-2 mb-0 leading-relaxed">
                                    {rejectionReason}
                                </Text>
                            </Section>

                            {/* Order summary */}
                            <Section className="bg-gray-50 rounded-lg px-5 py-4 mb-5">
                                <Text className="text-xs font-semibold text-gray-400 uppercase tracking-widest m-0 mb-3">
                                    Rejected order summary
                                </Text>
                                <Row>
                                    <Column>
                                        <Text className="text-xs text-gray-500 m-0">Items</Text>
                                        <Text className="text-sm font-semibold text-gray-900 mt-0.5 mb-0">
                                            {itemCount} items
                                        </Text>
                                    </Column>
                                    <Column>
                                        <Text className="text-xs text-gray-500 m-0">Total boxes</Text>
                                        <Text className="text-sm font-semibold text-gray-900 mt-0.5 mb-0">
                                            {totalBoxes} boxes
                                        </Text>
                                    </Column>
                                </Row>
                                <Hr className="border-gray-200 my-3" />
                                {items.map((item, i) => (
                                    <Row key={i} className="mb-1">
                                        <Column>
                                            <Text className="text-sm text-gray-700 m-0">
                                                {item.name}
                                            </Text>
                                        </Column>
                                        <Column className="text-right">
                                            <Text className="text-sm text-gray-500 m-0">
                                                {item.quantityBoxes} box{item.quantityBoxes !== 1 ? "es" : ""}
                                            </Text>
                                        </Column>
                                    </Row>
                                ))}
                            </Section>

                            {/* What to do next */}
                            <Section className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-6">
                                <Text className="text-xs font-semibold text-blue-700 uppercase tracking-widest m-0">
                                    What you can do
                                </Text>
                                <Text className="text-sm text-blue-800 mt-1 mb-0 leading-relaxed">
                                    You can resubmit a new order with adjusted quantities. Open
                                    your rejected order in the dashboard and click{" "}
                                    <strong>"Resubmit as New Order"</strong> to copy the items
                                    into a fresh draft.
                                </Text>
                            </Section>

                            {/* CTAs */}
                            <Section className="text-center">
                                <Button
                                    href={newOrderUrl}
                                    className="bg-indigo-600 text-white text-sm font-semibold px-6 py-3 rounded-lg no-underline mr-3"
                                >
                                    Resubmit Order →
                                </Button>
                                <Button
                                    href={dashboardUrl}
                                    className="bg-white text-gray-700 text-sm font-semibold px-6 py-3 rounded-lg no-underline border border-gray-300"
                                >
                                    View Order
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

export default OrderRejected;