<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProductionDetail extends Model
{
    use HasFactory;

    protected $fillable = [
        'production_id',
        'raw_material_id',
        'planned_quantity',
        'actual_quantity',
        'unit_cost',
        'total_cost',
        'waste_quantity',
        'notes',
    ];

    protected $casts = [
        'planned_quantity' => 'decimal:2',
        'actual_quantity' => 'decimal:2',
        'unit_cost' => 'decimal:2',
        'total_cost' => 'decimal:2',
        'waste_quantity' => 'decimal:2',
    ];

    /**
     * Get the production that owns this detail
     */
    public function production()
    {
        return $this->belongsTo(Production::class);
    }

    /**
     * Get the raw material for this detail
     */
    public function rawMaterial()
    {
        return $this->belongsTo(RawMaterial::class);
    }

    /**
     * Calculate efficiency (actual vs planned)
     */
    public function getEfficiencyAttribute()
    {
        if ($this->planned_quantity == 0) return 0;
        return round(($this->actual_quantity / $this->planned_quantity) * 100, 2);
    }

    /**
     * Calculate waste percentage
     */
    public function getWastePercentageAttribute()
    {
        if ($this->actual_quantity == 0) return 0;
        return round(($this->waste_quantity / $this->actual_quantity) * 100, 2);
    }

    /**
     * Get variance between planned and actual
     */
    public function getVarianceAttribute()
    {
        return $this->actual_quantity - $this->planned_quantity;
    }
}