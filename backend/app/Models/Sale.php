<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\Order;

class Sale extends Model
{
    use HasFactory;

    protected $fillable = [
        'order_number',
        'customer_name',
        'customer_email',
        'product_name',
        'quantity_sold',
        'unit_price',
        'total_amount',
        'discount_amount',
        'final_amount',
        'payment_method',
        'payment_status',
        'order_status',
        'sale_date',
        'delivery_date',
        'sales_channel',
        'region',
        'notes',
        'salesperson_id',
    ];

    protected $casts = [
        'sale_date' => 'date',
        'delivery_date' => 'date',
        'unit_price' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'final_amount' => 'decimal:2',
    ];

    /**
     * Get the salesperson for this sale
     */
    public function salesperson()
    {
        return $this->belongsTo(User::class, 'salesperson_id');
    }

    /**
     * Calculate profit margin
     */
    public function getProfitMarginAttribute()
    {
        // This would need cost data to calculate actual profit
        // For now, return a placeholder calculation
        return round(($this->final_amount * 0.3), 2); // Assuming 30% margin
    }

    /**
     * Check if order is completed
     */
    public function isCompleted()
    {
        return $this->order_status === 'delivered';
    }

    /**
     * Check if payment is completed
     */
    public function isPaid()
    {
        return $this->payment_status === 'paid';
    }

    /**
     * Create or update sale record from order data.
     */
    public static function syncFromOrder(Order $order): self
    {
        $order->loadMissing(['orderItems', 'cashier', 'payments']);

        $quantitySold = max(1, (int) $order->orderItems->sum('quantity'));
        $productNames = $order->orderItems
            ->pluck('product_name')
            ->filter()
            ->unique()
            ->values();

        $productLabel = $productNames->isNotEmpty()
            ? $productNames->take(3)->implode(', ')
            : ('Order #' . $order->order_number);

        $completedPayment = $order->payments()
            ->where('status', 'completed')
            ->latest('payment_date')
            ->first();

        $discountAmount = (float) ($order->discount_amount ?? 0);
        $finalAmount = (float) ($order->total_amount ?? 0);
        $grossAmount = $finalAmount + $discountAmount;

        $orderStatus = match ($order->status) {
            'completed' => 'delivered',
            'cancelled' => 'cancelled',
            default => 'processing',
        };

        return static::updateOrCreate(
            ['order_number' => $order->order_number],
            [
                'customer_name' => $order->customer_name ?: 'Walk-in Customer',
                'customer_email' => null,
                'product_name' => $productLabel,
                'quantity_sold' => $quantitySold,
                'unit_price' => $quantitySold > 0 ? round($finalAmount / $quantitySold, 2) : 0,
                'total_amount' => $grossAmount,
                'discount_amount' => $discountAmount,
                'final_amount' => $finalAmount,
                'payment_method' => $completedPayment?->payment_method ?? 'cash',
                'payment_status' => $order->isFullyPaid() ? 'paid' : 'pending',
                'order_status' => $orderStatus,
                'sale_date' => optional($order->order_date)->toDateString() ?? now()->toDateString(),
                'delivery_date' => null,
                'sales_channel' => 'store',
                'region' => 'main_store',
                'notes' => $order->notes,
                'salesperson_id' => $order->cashier_id,
            ]
        );
    }
}
