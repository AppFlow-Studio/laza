ALTER TABLE email_delivery_logs
    DROP CONSTRAINT email_delivery_logs_email_type_check;

ALTER TABLE email_delivery_logs
    ADD CONSTRAINT email_delivery_logs_email_type_check
    CHECK (email_type = ANY (ARRAY[
        'low_stock_alert',
        'low_stock_digest',
        'daily_summary',
        'inventory_adjustment_request'
    ]));
