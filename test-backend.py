

def process_payment(card_number):
    log_message = f"Processing payment for card: {card_number}"
    print(log_message)
    return True


def handle_stripe_webhook(payload):
    print(f"Received stripe webhook with raw payload: {payload}")
    return True

