<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Payment extends Model
{
    use HasFactory;

    protected $fillable = [
        'order_id',
        'payment_method',
        'amount_paid',
        'change_amount',
        'transaction_id',
        'card_last_four',
        'status',
        'notes',
        'payment_date',
    ];

    protected $casts = [
        'amount_paid' => 'decimal:2',
        'change_amount' => 'decimal:2',
        'payment_date' => 'datetime',
    ];

    /**
     * Get the order that owns this payment
     */
    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    /**
     * Get payment method display name
     */
    public function getPaymentMethodDisplayAttribute()
    {
        return match($this->payment_method) {
            'cash' => 'Cash',
            'transfer' => 'Transfer',
            'bank_transfer' => 'Transfer',
            default => ucfirst($this->payment_method)
        };
    }

    /**
     * Generate transaction ID
     */
    public static function generateTransactionId()
    {
        return 'TXN' . now()->format('YmdHis') . rand(1000, 9999);
    }
}
