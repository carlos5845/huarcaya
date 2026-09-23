<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreBranchRequest;
use App\Http\Requests\UpdateBranchRequest;
use App\Models\Branch;
use Illuminate\Support\Str;
use Inertia\Inertia;

class BranchController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $branches = Branch::orderBy('id', 'asc')->get();

        return Inertia::render('branches/index', [
            'branches' => $branches,
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        //
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreBranchRequest $request)
    {
        $data = $request->validated();
        $prefix = $data['code_prefix'];
        unset($data['code_prefix']);

        $data['uuid'] = Str::uuid()->toString();
        $data['company_id'] = auth()->user()->company_id;

        $branch = Branch::create($data);

        // Count branches with same prefix to get the auto-increment number
        // or just use the ID. Let's use count for better sequential numbers per prefix:
        $count = Branch::where('company_id', $data['company_id'])
            ->whereLikeAccentInsensitive('code', $prefix.'-%')
            ->count();
        // Since we just created one, if it's the only one it will be 0 before this?
        // Wait, the new branch doesn't have code yet.
        // It's safer to just get the max number or count + 1.

        $branch->code = $prefix.'-'.str_pad($count + 1, 3, '0', STR_PAD_LEFT);
        $branch->save();

        return redirect()->route('branches.index')->with('success', 'Sucursal creada exitosamente.');
    }

    /**
     * Display the specified resource.
     */
    public function show(Branch $branch)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Branch $branch)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateBranchRequest $request, Branch $branch)
    {
        $branch->update($request->validated());

        return redirect()->route('branches.index')->with('success', 'Sucursal actualizada exitosamente.');
    }

    /**
     * Remove the specified resource from storage (soft delete via status).
     */
    public function destroy(Branch $branch)
    {
        $branch->update(['status' => $branch->status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE']);

        $message = $branch->status === 'ACTIVE' ? 'Sucursal reactivada exitosamente.' : 'Sucursal desactivada exitosamente.';

        return redirect()->route('branches.index')->with('success', $message);
    }
}
